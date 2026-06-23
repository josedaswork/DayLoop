package com.example.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "hobbies")
data class Hobby(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val type: String, // "recurring" or "temporary"
    val icon: String, // emoji String e.g. "🎸"
    val color: String, // Hex string e.g. "#2980b9"
    val progress: Int = 0,
    val status: String = "active", // "active" or "archived"
    @ColumnInfo(name = "created_date") val createdDate: String // "YYYY-MM-DD"
)

@Entity(
    tableName = "hobby_logs",
    indices = [Index(value = ["hobby_id", "date"], unique = true)]
)
data class HobbyLog(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    @ColumnInfo(name = "hobby_id") val hobbyId: Int,
    val date: String, // "YYYY-MM-DD"
    val done: Boolean,
    @ColumnInfo(name = "progress_snapshot") val progressSnapshot: Int = 0
)

@Dao
interface HobbyDao {
    @Query("SELECT * FROM hobbies WHERE status = 'active' ORDER BY id DESC")
    fun getActiveHobbies(): Flow<List<Hobby>>

    @Query("SELECT * FROM hobbies ORDER BY id DESC")
    fun getAllHobbies(): Flow<List<Hobby>>

    @Query("SELECT * FROM hobbies")
    suspend fun getAllHobbiesList(): List<Hobby>

    @Query("SELECT * FROM hobbies WHERE id = :id LIMIT 1")
    suspend fun getHobbyById(id: Int): Hobby?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHobby(hobby: Hobby): Long

    @Update
    suspend fun updateHobby(hobby: Hobby)

    @Delete
    suspend fun deleteHobby(hobby: Hobby)

    @Query("DELETE FROM hobbies WHERE id = :id")
    suspend fun deleteHobbyById(id: Int)

    // Logs
    @Query("SELECT * FROM hobby_logs ORDER BY date DESC")
    fun getAllLogs(): Flow<List<HobbyLog>>

    @Query("SELECT * FROM hobby_logs")
    suspend fun getAllLogsList(): List<HobbyLog>

    @Query("SELECT * FROM hobby_logs WHERE hobby_id = :hobbyId")
    fun getLogsForHobby(hobbyId: Int): Flow<List<HobbyLog>>

    @Query("SELECT * FROM hobby_logs WHERE hobby_id = :hobbyId")
    suspend fun getLogsForHobbyList(hobbyId: Int): List<HobbyLog>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: HobbyLog): Long

    @Query("DELETE FROM hobby_logs WHERE hobby_id = :hobbyId")
    suspend fun deleteLogsForHobby(hobbyId: Int)

    @Query("DELETE FROM hobby_logs WHERE id = :id")
    suspend fun deleteLogById(id: Int)
}

@Database(entities = [Hobby::class, HobbyLog::class], version = 1, exportSchema = false)
abstract class HobbyDatabase : RoomDatabase() {
    abstract fun hobbyDao(): HobbyDao
}
