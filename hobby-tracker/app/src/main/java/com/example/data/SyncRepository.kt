package com.example.data

import android.content.Context
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SyncRepository(private val context: Context, private val hobbyDao: HobbyDao) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .followRedirects(true) // Google Apps Script uses REDIRECT (302) heavily!
        .followSslRedirects(true)
        .build()

    fun getSyncUrl(): String {
        val prefs = context.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)
        return prefs.getString("apps_script_url", "") ?: ""
    }

    fun saveSyncUrl(url: String) {
        val prefs = context.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("apps_script_url", url).apply()
    }

    suspend fun syncWithSpreadsheet(): Result<SyncResult> {
        val url = getSyncUrl()
        if (url.isEmpty()) {
            return Result.failure(Exception("La URL de sincronización no está configurada."))
        }

        return try {
            // 1. Get local items
            val localHobbies = hobbyDao.getAllHobbiesList()
            val localLogs = hobbyDao.getAllLogsList()

            // 2. Build request JSON payload
            val rootObj = JSONObject()
            
            val hobbiesArray = JSONArray()
            localHobbies.forEach { h ->
                val hObj = JSONObject()
                hObj.put("id", h.id)
                hObj.put("name", h.name)
                hObj.put("type", h.type)
                hObj.put("icon", h.icon)
                hObj.put("color", h.color)
                hObj.put("progress", h.progress)
                hObj.put("status", h.status)
                hObj.put("created_date", h.createdDate)
                hobbiesArray.put(hObj)
            }
            rootObj.put("hobbies", hobbiesArray)

            val logsArray = JSONArray()
            localLogs.forEach { l ->
                val lObj = JSONObject()
                lObj.put("hobby_id", l.hobbyId)
                lObj.put("date", l.date)
                lObj.put("done", l.done)
                lObj.put("progress_snapshot", l.progressSnapshot)
                logsArray.put(lObj)
            }
            rootObj.put("logs", logsArray)

            Log.d("SyncRepository", "Syncing JSON: $rootObj")

            // 3. Post to App Script URL (POST is used for both publishing and receiving merged state)
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBody = rootObj.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(url)
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return Result.failure(Exception("Error de red: Código ${response.code}"))
            }

            val bodyString = response.body?.string() ?: ""
            Log.d("SyncRepository", "Response body: $bodyString")

            val responseObj = JSONObject(bodyString)
            val success = responseObj.optBoolean("success", false)
            if (!success) {
                val errorMsg = responseObj.optString("message", "Error desconocido de App Script")
                return Result.failure(Exception(errorMsg))
            }

            // 4. Overwrite local database with Google Sheets Merged data
            val serverHobbies = responseObj.getJSONArray("hobbies")
            val serverLogs = responseObj.getJSONArray("logs")

            // We do a full clear and insert of database on transaction
            // Note: Since IDs are auto-generated locally or matched from spreadsheet, we insert them explicitly.
            // But we must stop the live flows, replace items, and make sure we don't break relations.
            
            val returnedHobbies = mutableListOf<Hobby>()
            val returnedLogs = mutableListOf<HobbyLog>()

            // We will truncate and repopulate on direct transaction
            // Since we're in a suspend function, we can safely execute Dao changes step-by-step
            
            // To ensure the IDs match exactly what was in the spreadsheet (since they are synced),
            // let's clear the tables entirely and insert everything again with correct IDs.
            for (i in 0 until serverHobbies.length()) {
                val hObj = serverHobbies.getJSONObject(i)
                returnedHobbies.add(
                    Hobby(
                        id = hObj.optInt("id", 0),
                        name = hObj.getString("name"),
                        type = hObj.getString("type"),
                        icon = hObj.getString("icon"),
                        color = hObj.getString("color"),
                        progress = hObj.optInt("progress", 0),
                        status = hObj.optString("status", "active"),
                        createdDate = hObj.optString("created_date", "2026-06-19")
                    )
                )
            }

            for (i in 0 until serverLogs.length()) {
                val lObj = serverLogs.getJSONObject(i)
                returnedLogs.add(
                    HobbyLog(
                        hobbyId = lObj.getInt("hobby_id"),
                        date = lObj.getString("date"),
                        done = lObj.getBoolean("done"),
                        progressSnapshot = lObj.optInt("progress_snapshot", 0)
                    )
                )
            }

            // Execute database transaction securely
            replaceLocalData(returnedHobbies, returnedLogs)

            Result.success(SyncResult(returnedHobbies.size, returnedLogs.size))

        } catch (e: Exception) {
            Log.e("SyncRepository", "Sync failed", e)
            Result.failure(e)
        }
    }

    private suspend fun replaceLocalData(hobbies: List<Hobby>, logs: List<HobbyLog>) {
        // Clear all hobbies
        val allLocal = hobbyDao.getAllHobbiesList()
        allLocal.forEach { hobbyDao.deleteHobby(it) }

        // Clear all logs
        val allLocalLogs = hobbyDao.getAllLogsList()
        // Wait, since we don't have a truncate log table DAO query, let's delete log logs by deleting for hobby
        allLocal.forEach { hobbyDao.deleteLogsForHobby(it.id) }

        // Now delete by specific query to ensure remaining records are removed
        // Let's delete all log records using local IDs
        allLocalLogs.forEach { log ->
            hobbyDao.deleteLogById(log.id)
        }

        // Insert new synced hobbies
        hobbies.forEach {
            hobbyDao.insertHobby(it)
        }

        // Insert new synced logs
        logs.forEach {
            hobbyDao.insertLog(it)
        }
    }
}

data class SyncResult(
    val hobbiesCount: Int,
    val logsCount: Int
)
