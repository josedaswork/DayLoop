package com.example

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import androidx.room.Room
import com.example.data.*
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

// Dynamic Color converter helper
fun parseColor(hex: String, defaultColor: Color = Color(0xFF2C3E50)): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (e: Exception) {
        defaultColor
    }
}

class MainActivity : ComponentActivity() {
    private lateinit var database: HobbyDatabase
    private lateinit var syncRepository: SyncRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        database = Room.databaseBuilder(
            applicationContext,
            HobbyDatabase::class.java,
            "hobby_tracker_database"
        ).fallbackToDestructiveMigration().build()

        syncRepository = SyncRepository(applicationContext, database.hobbyDao())

        setContent {
            MyApplicationTheme {
                val navController = rememberNavController()
                val hobbyViewModel: HobbyViewModel = viewModel(factory = HobbyViewModelFactory(database.hobbyDao(), syncRepository))

                NavHost(
                    navController = navController,
                    startDestination = "home",
                    modifier = Modifier.fillMaxSize()
                ) {
                    composable("home") {
                        HomeScreen(navController, hobbyViewModel)
                    }
                    composable(
                        route = "hobby/{id}",
                        arguments = listOf(navArgument("id") { type = NavType.IntType })
                    ) { backStackEntry ->
                        val id = backStackEntry.arguments?.getInt("id") ?: 0
                        HobbyDetailScreen(navController, id, hobbyViewModel)
                    }
                    composable("new") {
                        NewHobbyScreen(navController, hobbyViewModel)
                    }
                    composable(
                        route = "edit/{id}",
                        arguments = listOf(navArgument("id") { type = NavType.IntType })
                    ) { backStackEntry ->
                        val id = backStackEntry.arguments?.getInt("id") ?: 0
                        EditHobbyScreen(navController, id, hobbyViewModel)
                    }
                    composable("stats") {
                        StatsScreen(navController, hobbyViewModel)
                    }
                    composable("sync") {
                        SyncScreen(navController, hobbyViewModel)
                    }
                }
            }
        }
    }
}

// Custom Factory for ViewModel Injection
class HobbyViewModelFactory(
    private val hobbyDao: HobbyDao,
    private val syncRepository: SyncRepository
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(HobbyViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return HobbyViewModel(hobbyDao, syncRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

class HobbyViewModel(
    private val hobbyDao: HobbyDao,
    private val syncRepository: SyncRepository
) : ViewModel() {

    private val _hobbies = MutableStateFlow<List<Hobby>>(emptyList())
    val hobbies: StateFlow<List<Hobby>> = _hobbies

    private val _logs = MutableStateFlow<List<HobbyLog>>(emptyList())
    val logs: StateFlow<List<HobbyLog>> = _logs

    private val _syncStatus = MutableStateFlow("Listo")
    val syncStatus: StateFlow<String> = _syncStatus

    init {
        viewModelScope.launch {
            hobbyDao.getActiveHobbies().collect {
                _hobbies.value = it
            }
        }
        viewModelScope.launch {
            hobbyDao.getAllLogs().collect {
                _logs.value = it
            }
        }
    }

    fun toggleTodayLog(hobby: Hobby) {
        viewModelScope.launch {
            val sFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val todayStr = sFormat.format(Date())
            val existing = _logs.value.find { it.hobbyId == hobby.id && it.date == todayStr }

            if (existing != null) {
                val updated = existing.copy(done = !existing.done)
                hobbyDao.insertLog(updated)
            } else {
                val newLog = HobbyLog(hobbyId = hobby.id, date = todayStr, done = true)
                hobbyDao.insertLog(newLog)
            }
        }
    }

    fun toggleLogForDate(hobbyId: Int, dateStr: String) {
        viewModelScope.launch {
            val existing = _logs.value.find { it.hobbyId == hobbyId && it.date == dateStr }
            if (existing != null) {
                val updated = existing.copy(done = !existing.done)
                hobbyDao.insertLog(updated)
            } else {
                val newLog = HobbyLog(hobbyId = hobbyId, date = dateStr, done = true)
                hobbyDao.insertLog(newLog)
            }
        }
    }

    fun updateProgress(hobbyId: Int, valPercent: Int) {
        viewModelScope.launch {
            val hobby = hobbyDao.getHobbyById(hobbyId)
            if (hobby != null) {
                val updatedHobby = hobby.copy(
                    progress = valPercent,
                    status = if (valPercent >= 100) "completed" else "active"
                )
                hobbyDao.updateHobby(updatedHobby)

                // Append snapshot log for today
                val sFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val todayStr = sFormat.format(Date())
                val existing = _logs.value.find { it.hobbyId == hobbyId && it.date == todayStr }
                if (existing != null) {
                    hobbyDao.insertLog(existing.copy(progressSnapshot = valPercent, done = true))
                } else {
                    hobbyDao.insertLog(HobbyLog(hobbyId = hobbyId, date = todayStr, done = true, progressSnapshot = valPercent))
                }
            }
        }
    }

    fun createHobby(name: String, type: String, icon: String, color: String) {
        viewModelScope.launch {
            val sFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val todayStr = sFormat.format(Date())
            val newHobby = Hobby(
                name = name,
                type = type,
                icon = icon,
                color = color,
                progress = 0,
                status = "active",
                createdDate = todayStr
            )
            hobbyDao.insertHobby(newHobby)
        }
    }

    fun updateHobbyDetails(hobbyId: Int, name: String, type: String, icon: String, color: String) {
        viewModelScope.launch {
            val hobby = hobbyDao.getHobbyById(hobbyId)
            if (hobby != null) {
                val updatedHobby = hobby.copy(
                    name = name,
                    type = type,
                    icon = icon,
                    color = color
                )
                hobbyDao.updateHobby(updatedHobby)
            }
        }
    }

    fun archiveHobby(id: Int) {
        viewModelScope.launch {
            val hobby = hobbyDao.getHobbyById(id)
            if (hobby != null) {
                hobbyDao.updateHobby(hobby.copy(status = "archived"))
            }
        }
    }

    fun deleteHobby(id: Int) {
        viewModelScope.launch {
            hobbyDao.deleteHobbyById(id)
            hobbyDao.deleteLogsForHobby(id)
        }
    }

    // Sync URLs
    fun getSyncUrl(): String {
        return syncRepository.getSyncUrl()
    }

    fun saveSyncUrl(url: String) {
        syncRepository.saveSyncUrl(url)
    }

    fun syncDataWithSpreadsheet(onFinished: (Boolean, String) -> Unit) {
        _syncStatus.value = "Sincronizando..."
        viewModelScope.launch {
            val res = withContext(Dispatchers.IO) {
                syncRepository.syncWithSpreadsheet()
            }
            res.fold(
                onSuccess = {
                    _syncStatus.value = "Sincronizado"
                    onFinished(true, "¡Sincronizado con éxito! Haces: ${it.hobbiesCount} hábitos, ${it.logsCount} logs.")
                },
                onFailure = {
                    _syncStatus.value = "Error"
                    onFinished(false, it.message ?: "Error desconocido al sincronizar.")
                }
            )
        }
    }
}

// 1. HOME SCREEN
@OptIn(ExperimentalAnimationApi::class)
@Composable
fun HomeScreen(navController: NavController, viewModel: HobbyViewModel) {
    val hobbies by viewModel.hobbies.collectAsState()
    val logs by viewModel.logs.collectAsState()

    val context = LocalContext.current
    val todayFormat = remember { SimpleDateFormat("EEEE d 'de' MMMM", Locale("es", "ES")) }
    val todayLabel = remember { todayFormat.format(Date()).replaceFirstChar { it.uppercase() } }
    val todayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

    val recurring = hobbies.filter { it.type == "recurring" }
    val temporary = hobbies.filter { it.type == "temporary" }

    val isTodayDone: (Int) -> Boolean = { id ->
        logs.any { it.hobbyId == id && it.date == todayStr && it.done }
    }

    val totalToday = recurring.filter { isTodayDone(it.id) }.size
    val allCompleted = recurring.isNotEmpty() && totalToday == recurring.size

    val headingTitle = when {
        hobbies.isEmpty() -> "Tu colección"
        allCompleted -> "Todo listo ✦"
        else -> "Hoy"
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 80.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                // Header
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 24.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = todayLabel,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = headingTitle,
                                style = MaterialTheme.typography.displayMedium,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        IconButton(
                            onClick = { navController.navigate("sync") },
                            modifier = Modifier
                                .background(
                                    MaterialTheme.colorScheme.secondaryContainer,
                                    CircleShape
                                )
                                .size(44.dp)
                                .testTag("sync_cloud_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudSync,
                                contentDescription = "Sincronizador Excel",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                // Recurring Habits
                if (recurring.isNotEmpty()) {
                    itemsIndexed(recurring) { index, hobby ->
                        val done = isTodayDone(hobby.id)
                        val habitColor = parseColor(hobby.color)
                        val streak = computeStreak(hobby.id, logs)

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                // Check button
                                Box(
                                    modifier = Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(if (done) habitColor else Color.Transparent)
                                        .border(
                                            2.dp,
                                            if (done) Color.Transparent else MaterialTheme.colorScheme.outline,
                                            CircleShape
                                        )
                                        .clickable { viewModel.toggleTodayLog(hobby) }
                                        .testTag("check_${hobby.id}"),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (done) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "Completado",
                                            tint = Color.White,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(16.dp))

                                // Content description info
                                Column(
                                    modifier = Modifier.weight(1.0f)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Start
                                    ) {
                                        Text(
                                            text = "${hobby.icon}  ${hobby.name}",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary,
                                            textDecoration = if (done) TextDecoration.LineThrough else TextDecoration.None,
                                            fontWeight = FontWeight.Medium
                                        )
                                        if (streak >= 2) {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "$streak días",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    // MiniDots for the last 14 days
                                    MiniDots(hobbyId = hobby.id, logs = logs, color = habitColor)
                                }

                                // Detail arrow
                                IconButton(
                                    onClick = { navController.navigate("hobby/${hobby.id}") },
                                    modifier = Modifier.testTag("detail_arrow_${hobby.id}")
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ChevronRight,
                                        contentDescription = "Detalles",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                    )
                                }
                            }

                            if (index < recurring.size - 1) {
                                Box(
                                    modifier = Modifier
                                        .padding(start = 48.dp)
                                        .fillMaxWidth()
                                        .height(1.dp)
                                        .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                                )
                            }
                        }
                    }
                }

                // Spacer
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Temporary / Projects
                if (temporary.isNotEmpty()) {
                    item {
                        Text(
                            text = "PROYECTOS",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                        )
                    }

                    items(temporary) { project ->
                        val projectColor = parseColor(project.color)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { navController.navigate("hobby/${project.id}") }
                                .padding(horizontal = 24.dp, vertical = 14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = project.icon,
                                        style = MaterialTheme.typography.titleLarge
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = project.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                                Text(
                                    text = "${project.progress}%",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Custom progress track
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxHeight()
                                        .fillMaxWidth(project.progress / 100f)
                                        .background(projectColor)
                                )
                            }
                        }
                    }
                }

                // Empty state
                if (hobbies.isEmpty()) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp, vertical = 40.dp)
                        ) {
                            Text(
                                text = "Añade tu primer hobby y empieza a construir tu rutina diaria.",
                                style = MaterialTheme.typography.bodyLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                lineHeight = 24.sp
                            )
                        }
                    }
                }
            }

            // Bottom bar floating style
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background.copy(alpha = 0.95f))
                    .border(
                        1.dp,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                    )
                    .padding(horizontal = 24.dp, vertical = 12.dp)
                    .windowInsetsPadding(WindowInsets.navigationBars),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier
                        .clickable { navController.navigate("stats") }
                        .padding(vertical = 8.dp)
                        .testTag("stats_button"),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.BarChart,
                        contentDescription = "Estadísticas",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Estadísticas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                IconButton(
                    onClick = { navController.navigate("new") },
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                        .size(46.dp)
                        .testTag("add_hobby_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Agregar hobby",
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
        }
    }
}

@Composable
fun MiniDots(hobbyId: Int, logs: List<HobbyLog>, color: Color) {
    val sdf = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }
    val days = remember(logs) {
        val cal = Calendar.getInstance()
        val datesList = mutableListOf<String>()
        // Build last 14 days
        cal.add(Calendar.DAY_OF_YEAR, -13)
        for (i in 0 until 14) {
            datesList.add(sdf.format(cal.time))
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        datesList.map { dateStr ->
            logs.any { it.hobbyId == hobbyId && it.date == dateStr && it.done }
        }
    }

    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        days.forEach { done ->
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(if (done) color else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
            )
        }
    }
}

// Compute consecutive streaks
fun computeStreak(hobbyId: Int, logs: List<HobbyLog>): Int {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val cal = Calendar.getInstance()

    val doneDates = logs.filter { it.hobbyId == hobbyId && it.done }.map { it.date }.toSet()

    val todayStr = sdf.format(cal.time)
    cal.add(Calendar.DAY_OF_YEAR, -1)
    val yesterdayStr = sdf.format(cal.time)

    if (!doneDates.contains(todayStr) && !doneDates.contains(yesterdayStr)) {
        return 0
    }

    var checkStr = if (doneDates.contains(todayStr)) todayStr else yesterdayStr
    var streak = 0
    try {
        cal.time = sdf.parse(checkStr) ?: Date()
        while (true) {
            val dateStr = sdf.format(cal.time)
            if (doneDates.contains(dateStr)) {
                streak++
                cal.add(Calendar.DAY_OF_YEAR, -1)
            } else {
                break
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return streak
}

// 2. DETAIL SCREEN
@Composable
fun HobbyDetailScreen(navController: NavController, id: Int, viewModel: HobbyViewModel) {
    val hobbies by viewModel.hobbies.collectAsState()
    val logs by viewModel.logs.collectAsState()

    val hobby = hobbies.find { it.id == id }

    if (hobby == null) {
        Scaffold { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Hobby no encontrado", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(16.dp))
                    TextButton(onClick = { navController.navigateUp() }) {
                        Text("Volver")
                    }
                }
            }
        }
        return
    }

    val habitColor = parseColor(hobby.color)

    // Stats calculations
    val totalDone = logs.filter { it.hobbyId == id && it.done }.size
    val streak = computeStreak(id, logs)

    // Consistencia rate: (done days of last 120 days / 120) * 100
    val consistencyRate = remember(logs) {
        val cal = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        var possible = 0
        var doneCount = 0
        cal.add(Calendar.DAY_OF_YEAR, -119) // last 120 days
        for (i in 0 until 120) {
            val dStr = sdf.format(cal.time)
            // Checked if database record was created on or before date
            val createdTimeStr = hobby.createdDate
            if (dStr >= createdTimeStr && dStr <= sdf.format(Date())) {
                possible++
                if (logs.any { it.hobbyId == id && it.date == dStr && it.done }) {
                    doneCount++
                }
            }
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        if (possible > 0) Math.round((doneCount.toFloat() / possible) * 100) else 0
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            // Header buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = { navController.navigateUp() },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Retroceder",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Volver", style = MaterialTheme.typography.bodyLarge)
                }

                TextButton(
                    onClick = { navController.navigate("edit/${hobby.id}") },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.testTag("edit_hobby_heading_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Editar",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Editar", style = MaterialTheme.typography.bodyLarge)
                }
            }

            // Target information
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = hobby.icon,
                    fontSize = 36.sp
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text(
                        text = hobby.name,
                        style = MaterialTheme.typography.displayMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (hobby.type == "recurring") "Hábito diario" else "Proyecto",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Stats grid
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "$streak días",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "RACHA ACTUAL",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                }
                Column {
                    Text(
                        text = "$totalDone días",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "TOTAL",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                }
                Column {
                    Text(
                        text = "$consistencyRate%",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "CONSISTENCIA",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Progress slider for temporary
            if (hobby.type == "temporary") {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                ) {
                    Text(
                        text = "PROGRESO",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Slider(
                            value = hobby.progress.toFloat(),
                            onValueChange = { viewModel.updateProgress(hobby.id, it.toInt()) },
                            valueRange = 0f..100f,
                            steps = 19, // steps of 5%
                            colors = SliderDefaults.colors(
                                thumbColor = habitColor,
                                activeTrackColor = habitColor,
                                inactiveTrackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                            ),
                            modifier = Modifier.weight(1.0f)
                        )

                        Spacer(modifier = Modifier.width(16.dp))

                        Text(
                            text = "${hobby.progress}%",
                            style = MaterialTheme.typography.displayMedium,
                            color = habitColor,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    if (hobby.progress >= 100) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "¡Proyecto completado! 🎉",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4-Month Calendar Heatmap
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
            ) {
                Text(
                    text = "ÚLTIMOS 4 MESES",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Render 16 columns of weeks starting Monday
                val weeks = remember { getCalendarWeeks(16) }
                val todayStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    weeks.forEach { weekDays ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            weekDays.forEach { dateStr ->
                                val inFuture = dateStr > todayStr
                                val done = logs.any { it.hobbyId == id && it.date == dateStr && it.done }

                                Box(
                                    modifier = Modifier
                                        .size(16.dp)
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(
                                            when {
                                                inFuture -> Color.Transparent
                                                done -> habitColor
                                                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                                            }
                                        )
                                        .clickable(enabled = !inFuture && hobby.type == "recurring") {
                                            viewModel.toggleLogForDate(id, dateStr)
                                        }
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            // Secondary controls
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        1.dp,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                    )
                    .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.15f))
                    .padding(24.dp)
            ) {
                TextButton(
                    onClick = {
                        viewModel.archiveHobby(id)
                        navController.navigateUp()
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Archive,
                        contentDescription = "Archivar",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        "Archivar hobby",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                TextButton(
                    onClick = {
                        viewModel.deleteHobby(id)
                        navController.navigateUp()
                    },
                    modifier = Modifier.testTag("delete_hobby_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Eliminar",
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        "Eliminar hobby",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }
    }
}

// Generate calendar weeks starting Monday
fun getCalendarWeeks(weeksCount: Int = 16): List<List<String>> {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val cal = Calendar.getInstance()
    cal.firstDayOfWeek = Calendar.MONDAY

    // Go back weeksCount - 1 weeks, set to MONDAY
    cal.add(Calendar.WEEK_OF_YEAR, -weeksCount + 1)
    cal.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)

    val weeks = mutableListOf<List<String>>()
    for (w in 0 until weeksCount) {
        val weekDays = mutableListOf<String>()
        for (d in 0 until 7) {
            weekDays.add(sdf.format(cal.time))
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        weeks.add(weekDays)
    }
    return weeks
}


// 3. NEW HOBBY SCREEN
@Composable
fun NewHobbyScreen(navController: NavController, viewModel: HobbyViewModel) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("recurring") } // "recurring" or "temporary"
    var icon by remember { mutableStateOf("🎸") }
    var color by remember { mutableStateOf("#2C3E50") }

    val ICONS = listOf("🎸", "📚", "🎨", "🏃", "🧘", "🎹", "✍️", "📷", "💪", "🧩", "🌱", "🎬", "🎤", "🏊", "🚴", "🧠", "🎲", "🪴", "🍳", "💻")
    val COLORS = listOf("#C0392B", "#2980B9", "#27AE60", "#8E44AD", "#E67E22", "#16A085", "#2C3E50", "#D35400")

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Return buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalArrangement = Arrangement.Start
                ) {
                    TextButton(
                        onClick = { navController.navigateUp() },
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Retroceder"
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cancelar", style = MaterialTheme.typography.bodyLarge)
                    }
                }

                Text(
                    text = "Nuevo hobby",
                    style = MaterialTheme.typography.displayMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Name label and input
                Text(
                    text = "NOMBRE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                TextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Guitarra, Leer, Correr...", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) },
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                        unfocusedIndicatorColor = MaterialTheme.colorScheme.outline
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("new_hobby_name_input")
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Type label and radio checks
                Text(
                    text = "TIPO",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .weight(1.0f)
                            .clickable { type = "recurring" }
                            .border(
                                1.dp,
                                if (type == "recurring") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp)
                    ) {
                        RadioButton(
                            selected = type == "recurring",
                            onClick = { type = "recurring" }
                        )
                        Text(
                            "Hábito diario",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Lo practico regularmente",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Column(
                        modifier = Modifier
                            .weight(1.0f)
                            .clickable { type = "temporary" }
                            .border(
                                1.dp,
                                if (type == "temporary") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp)
                    ) {
                        RadioButton(
                            selected = type == "temporary",
                            onClick = { type = "temporary" }
                        )
                        Text(
                            "Proyecto",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Tiene una meta concreta",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Emoji picker label and grids
                Text(
                    text = "ICONO",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ICONS.forEach { item ->
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (icon == item) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent)
                                .clickable { icon = item }
                                .padding(4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = item, fontSize = 24.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Color picker labels and grids
                Text(
                    text = "COLOR",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    COLORS.forEach { hex ->
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color(android.graphics.Color.parseColor(hex)))
                                .border(
                                    width = if (color == hex) 3.dp else 0.dp,
                                    color = MaterialTheme.colorScheme.primary,
                                    shape = CircleShape
                                )
                                .clickable { color = hex }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(130.dp))
            }

            // Save floating action bar
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background.copy(alpha = 0.95f))
                    .padding(24.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.createHobby(name, type, icon, color)
                        navController.navigateUp()
                    },
                    enabled = name.trim().isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("save_hobby_button")
                ) {
                    Text("Crear hobby", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

// 3.5. EDIT HOBBY SCREEN
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EditHobbyScreen(navController: NavController, id: Int, viewModel: HobbyViewModel) {
    val hobbies by viewModel.hobbies.collectAsState()
    val hobby = hobbies.find { it.id == id }

    if (hobby == null) {
        Scaffold { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Hobby no encontrado", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(16.dp))
                    TextButton(onClick = { navController.navigateUp() }) {
                        Text("Volver")
                    }
                }
            }
        }
        return
    }

    var name by remember(hobby) { mutableStateOf(hobby.name) }
    var type by remember(hobby) { mutableStateOf(hobby.type) } // "recurring" or "temporary"
    var icon by remember(hobby) { mutableStateOf(hobby.icon) }
    var color by remember(hobby) { mutableStateOf(hobby.color) }

    val ICONS = listOf("🎸", "📚", "🎨", "🏃", "🧘", "🎹", "✍️", "📷", "💪", "🧩", "🌱", "🎬", "🎤", "🏊", "🚴", "🧠", "🎲", "🪴", "🍳", "💻")
    val COLORS = listOf("#C0392B", "#2980B9", "#27AE60", "#8E44AD", "#E67E22", "#16A085", "#2C3E50", "#D35400")

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                // Return buttons
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalArrangement = Arrangement.Start
                ) {
                    TextButton(
                        onClick = { navController.navigateUp() },
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Retroceder"
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cancelar", style = MaterialTheme.typography.bodyLarge)
                    }
                }

                Text(
                    text = "Editar hobby",
                    style = MaterialTheme.typography.displayMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Name label and input
                Text(
                    text = "NOMBRE",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                TextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Guitarra, Leer, Correr...", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) },
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                        unfocusedIndicatorColor = MaterialTheme.colorScheme.outline
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("edit_hobby_name_input")
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Type label and radio checks
                Text(
                    text = "TIPO",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .weight(1.0f)
                            .clickable { type = "recurring" }
                            .border(
                                1.dp,
                                if (type == "recurring") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp)
                    ) {
                        RadioButton(
                            selected = type == "recurring",
                            onClick = { type = "recurring" }
                        )
                        Text(
                            "Hábito diario",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Lo practico regularmente",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Column(
                        modifier = Modifier
                            .weight(1.0f)
                            .clickable { type = "temporary" }
                            .border(
                                1.dp,
                                if (type == "temporary") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                RoundedCornerShape(8.dp)
                            )
                            .padding(12.dp)
                    ) {
                        RadioButton(
                            selected = type == "temporary",
                            onClick = { type = "temporary" }
                        )
                        Text(
                            "Proyecto",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Tiene una meta concreta",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Emoji picker label and grids
                Text(
                    text = "ICONO",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ICONS.forEach { item ->
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (icon == item) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent)
                                .clickable { icon = item }
                                .padding(4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = item, fontSize = 24.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Color picker labels and grids
                Text(
                    text = "COLOR",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    COLORS.forEach { hex ->
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color(android.graphics.Color.parseColor(hex)))
                                .border(
                                    width = if (color == hex) 3.dp else 0.dp,
                                    color = MaterialTheme.colorScheme.primary,
                                    shape = CircleShape
                                )
                                .clickable { color = hex }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(130.dp))
            }

            // Save floating action bar
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background.copy(alpha = 0.95f))
                    .padding(24.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.updateHobbyDetails(hobby.id, name, type, icon, color)
                        navController.navigateUp()
                    },
                    enabled = name.trim().isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("save_edited_hobby_button")
                ) {
                    Text("Guardar cambios", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    verticalArrangement: Arrangement.Vertical = Arrangement.Top,
    content: @Composable () -> Unit
) {
    androidx.compose.foundation.layout.FlowRow(
        modifier = modifier,
        horizontalArrangement = horizontalArrangement,
        verticalArrangement = verticalArrangement,
        content = { content() }
    )
}

// 4. STATS SCREEN
@Composable
fun StatsScreen(navController: NavController, viewModel: HobbyViewModel) {
    val hobbies by viewModel.hobbies.collectAsState()
    val logs by viewModel.logs.collectAsState()

    var selectedHobbyId by remember { mutableStateOf("all") }
    val recurring = hobbies.filter { it.type == "recurring" }

    // Big numerical data
    val filteredLogs = remember(logs, selectedHobbyId) {
        if (selectedHobbyId == "all") {
            logs.filter { it.done }
        } else {
            val hId = selectedHobbyId.toIntOrNull() ?: 0
            logs.filter { it.hobbyId == hId && it.done }
        }
    }

    val totalSessions = filteredLogs.size

    val weeks = remember { getCalendarWeeks(16) }
    val today = remember { Date() }

    // Weekly consistency rates
    val chartData = remember(logs, selectedHobbyId, hobbies) {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val filteredHobbies = if (selectedHobbyId == "all") recurring else recurring.filter { it.id.toString() == selectedHobbyId }

        weeks.map { weekDays ->
            val daysInWeek = weekDays.filter { it <= sdf.format(today) }
            var possible = 0
            var doneCount = 0

            daysInWeek.forEach { dateStr ->
                filteredHobbies.forEach { h ->
                    if (dateStr >= h.createdDate) {
                        possible++
                        if (logs.any { it.hobbyId == h.id && it.date == dateStr && it.done }) {
                            doneCount++
                        }
                    }
                }
            }
            val label = if (weekDays.isNotEmpty()) {
                val cal = Calendar.getInstance()
                cal.time = sdf.parse(weekDays.first()) ?: Date()
                val formatShort = SimpleDateFormat("d MMM", Locale("es", "ES"))
                formatShort.format(cal.time)
            } else "-"

            WeeklyDataPoint(
                weekLabel = label,
                rate = if (possible > 0) ((doneCount.toFloat() / possible) * 100).toInt() else 0
            )
        }
    }

    val validWeeks = chartData.filter { it.rate > 0 || totalSessions > 0 }
    val avgRate = if (validWeeks.isNotEmpty()) validWeeks.map { it.rate }.average().toInt() else 0
    val bestWeekRate = if (chartData.isNotEmpty()) chartData.maxOf { it.rate } else 0

    // 90-day activity intensity
    val last90Intensity = remember(logs, selectedHobbyId, hobbies) {
        val cal = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val todayStr = sdf.format(today)
        val datesList = mutableListOf<String>()
        cal.add(Calendar.DAY_OF_YEAR, -89)
        for (i in 0 until 90) {
            datesList.add(sdf.format(cal.time))
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }

        val filteredHobbies = if (selectedHobbyId == "all") recurring else recurring.filter { it.id.toString() == selectedHobbyId }

        datesList.map { dateStr ->
            if (filteredHobbies.isEmpty() || dateStr > todayStr) {
                0.0f
            } else {
                val doneInDay = filteredHobbies.count { h ->
                    logs.any { it.hobbyId == h.id && it.date == dateStr && it.done }
                }
                doneInDay.toFloat() / filteredHobbies.size
            }
        }
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            // Back button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.Start
            ) {
                TextButton(
                    onClick = { navController.navigateUp() },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Retroceder"
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Volver", style = MaterialTheme.typography.bodyLarge)
                }
            }

            Text(
                text = "Estadísticas",
                style = MaterialTheme.typography.displayMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 24.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Filtering pills
            if (recurring.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // All Pill
                    FilterPill(
                        text = "Todos",
                        selected = selectedHobbyId == "all",
                        onClick = { selectedHobbyId = "all" }
                    )

                    recurring.forEach { h ->
                        FilterPill(
                            text = "${h.icon} ${h.name}",
                            selected = selectedHobbyId == h.id.toString(),
                            onClick = { selectedHobbyId = h.id.toString() }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Stat numbers
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "$totalSessions",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        "SESIONES",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                }

                Column {
                    Text(
                        text = "$avgRate%",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        "MEDIA SEMANAL",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                }

                Column {
                    Text(
                        text = "$bestWeekRate%",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        "MEJOR SEMANA",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Weekly Area Chart
            Text(
                text = "TRAYECTORIA SEMANAL",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 24.dp, end = 24.dp, bottom = 16.dp)
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .padding(horizontal = 16.dp)
            ) {
                WeeklyAreaChart(dataPoints = chartData, textColor = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 90-day Heatmap
            Text(
                text = "ÚLTIMOS 90 DÍAS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 24.dp, end = 24.dp, bottom = 16.dp)
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
            ) {
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    last90Intensity.forEach { intensity ->
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(
                                    if (intensity > 0f) {
                                        MaterialTheme.colorScheme.primary.copy(
                                            alpha = 0.15f + intensity * 0.85f
                                        )
                                    } else {
                                        MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                                    }
                                )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Nada",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp
                    )

                    listOf(0.15f, 0.4f, 0.65f, 0.85f, 1.0f).forEach { item ->
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = item))
                        )
                    }

                    Text(
                        text = "Todo",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Composable
fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (selected) MaterialTheme.colorScheme.primary else Color.Transparent)
            .border(
                1.dp,
                if (selected) Color.Transparent else MaterialTheme.colorScheme.outline,
                RoundedCornerShape(16.dp)
            )
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 6.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary
        )
    }
}

data class WeeklyDataPoint(
    val weekLabel: String,
    val rate: Int // 0 to 100
)

@Composable
fun WeeklyAreaChart(dataPoints: List<WeeklyDataPoint>, textColor: Color) {
    Canvas(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Transparent)
    ) {
        val width = size.width
        val height = size.height
        val paddingLeft = 32.dp.toPx()
        val paddingRight = 16.dp.toPx()
        val paddingTop = 16.dp.toPx()
        val paddingBottom = 24.dp.toPx()

        val usableWidth = width - paddingLeft - paddingRight
        val usableHeight = height - paddingTop - paddingBottom

        if (dataPoints.isEmpty()) return@Canvas

        val stepX = usableWidth / (dataPoints.size - 1)

        // Draw grid lines (horizontal 0%, 50%, 100%)
        val gridLines = listOf(0f, 0.5f, 1f)
        gridLines.forEach { percent ->
            val y = paddingTop + usableHeight * (1f - percent)
            drawLine(
                color = textColor.copy(alpha = 0.15f),
                start = Offset(paddingLeft, y),
                end = Offset(width - paddingRight, y),
                strokeWidth = 1f
            )
        }

        // Generate Path points
        val points = dataPoints.mapIndexed { i, dp ->
            val x = paddingLeft + i * stepX
            val rateNormalized = dp.rate / 100f
            val y = paddingTop + usableHeight * (1f - rateNormalized)
            Offset(x, y)
        }

        // Draw Filled Gradient Area
        val fillPath = Path().apply {
            moveTo(paddingLeft, paddingTop + usableHeight)
            points.forEach { point ->
                lineTo(point.x, point.y)
            }
            lineTo(paddingLeft + (dataPoints.size - 1) * stepX, paddingTop + usableHeight)
            close()
        }

        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(
                colors = listOf(
                    textColor.copy(alpha = 0.18f),
                    textColor.copy(alpha = 0.0f)
                ),
                startY = paddingTop,
                endY = paddingTop + usableHeight
            )
        )

        // Draw Outline Line
        val strokePath = Path().apply {
            if (points.isNotEmpty()) {
                moveTo(points.first().x, points.first().y)
                for (i in 1 until points.size) {
                    lineTo(points[i].x, points[i].y)
                }
            }
        }

        drawPath(
            path = strokePath,
            color = textColor,
            style = Stroke(width = 3f)
        )

        // Draw axis text labels for weeks optionally to give clean style
        // Let's draw first, middle, and last labels
        val paint = android.graphics.Paint().apply {
            color = textColor.hashCode()
            textSize = 24f
            textAlign = android.graphics.Paint.Align.CENTER
        }

        val firstPoint = dataPoints.firstOrNull()
        if (firstPoint != null) {
            drawContext.canvas.nativeCanvas.drawText(
                firstPoint.weekLabel,
                paddingLeft,
                height - 4f,
                paint
            )
        }

        val midIndex = dataPoints.size / 2
        val midPoint = dataPoints.getOrNull(midIndex)
        if (midPoint != null) {
            drawContext.canvas.nativeCanvas.drawText(
                midPoint.weekLabel,
                paddingLeft + midIndex * stepX,
                height - 4f,
                paint
            )
        }

        val lastPoint = dataPoints.lastOrNull()
        if (lastPoint != null) {
            drawContext.canvas.nativeCanvas.drawText(
                lastPoint.weekLabel,
                paddingLeft + (dataPoints.size - 1) * stepX,
                height - 4f,
                paint
            )
        }
    }
}


// 5. SYNC SCREEN
@Composable
fun SyncScreen(navController: NavController, viewModel: HobbyViewModel) {
    val syncStatus by viewModel.syncStatus.collectAsState()
    var inputUrl by remember { mutableStateOf(viewModel.getSyncUrl()) }
    var expandedHelp by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    val scriptCodeCode = """
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var hobbiesSheet = ss.getSheetByName("Hobbies") || ss.insertSheet("Hobbies");
    if (hobbiesSheet.getLastRow() === 0) {
      hobbiesSheet.appendRow(["id", "name", "type", "icon", "color", "progress", "status", "created_date"]);
    }
    
    var logsSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
    if (logsSheet.getLastRow() === 0) {
      logsSheet.appendRow(["hobby_id", "date", "done", "progress_snapshot"]);
    }
    
    var existingHobbies = readSheetData(hobbiesSheet);
    var existingLogs = readSheetData(logsSheet);
    
    var localHobbies = data.hobbies || [];
    var localLogs = data.logs || [];
    
    var mergedHobbies = mergeObjects(existingHobbies, localHobbies, "id");
    var mergedLogs = mergeLogs(existingLogs, localLogs);
    
    writeToSheet(hobbiesSheet, ["id", "name", "type", "icon", "color", "progress", "status", "created_date"], mergedHobbies);
    writeToSheet(logsSheet, ["hobby_id", "date", "done", "progress_snapshot"], mergedLogs);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      hobbies: mergedHobbies,
      logs: mergedLogs
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hobbiesSheet = ss.getSheetByName("Hobbies") || ss.insertSheet("Hobbies");
    var logsSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      hobbies: readSheetData(hobbiesSheet),
      logs: readSheetData(logsSheet)
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function readSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var list = [];
  for (var i = 0; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (headers[j] === "id" || headers[j] === "hobby_id" || headers[j] === "progress" || headers[j] === "progress_snapshot") {
        val = Number(val);
      } else if (headers[j] === "done") {
        val = (val === true || val === "true");
      }
      obj[headers[j]] = val;
    }
    list.push(obj);
  }
  return list;
}

function writeToSheet(sheet, headers, list) {
  sheet.clear();
  sheet.appendRow(headers);
  if (list.length === 0) return;
  var rows = list.map(item => {
    return headers.map(h => {
      var val = item[h];
      return (val === undefined || val === null) ? "" : val;
    });
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function mergeObjects(list1, list2, key) {
  var map = {};
  list1.forEach(item => { map[item[key]] = item; });
  list2.forEach(item => { map[item[key]] = item; });
  return Object.keys(map).map(k => map[k]);
}

function mergeLogs(list1, list2) {
  var map = {};
  list1.forEach(l => { map[l.hobby_id + "_" + l.date] = l; });
  list2.forEach(l => { map[l.hobby_id + "_" + l.date] = l; });
  return Object.keys(map).map(k => map[k]);
}
    """.trimIndent()

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Retroceder Back Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.Start
            ) {
                TextButton(
                    onClick = { navController.navigateUp() },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Retroceder"
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Volver", style = MaterialTheme.typography.bodyLarge)
                }
            }

            Text(
                text = "Sincronización",
                style = MaterialTheme.typography.displayMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Conecta tus hábitos y registros con Google Sheets o Excel usando un script personalizado de Google Apps Script.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 22.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            // URL Label and Input
            Text(
                text = "URL DEL SCRIPT WEB APP DE GOOGLE",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            TextField(
                value = inputUrl,
                onValueChange = {
                    inputUrl = it
                    viewModel.saveSyncUrl(it)
                },
                placeholder = { Text("https://script.google.com/macros/s/.../exec", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) },
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                    unfocusedIndicatorColor = MaterialTheme.colorScheme.outline
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("sync_url_input")
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Sync Status Block
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Estado",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = syncStatus,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = when (syncStatus) {
                            "Sincronizando..." -> MaterialTheme.colorScheme.primary
                            "Sincronizado" -> parseColor("#27AE60")
                            "Error" -> MaterialTheme.colorScheme.error
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                }

                Button(
                    onClick = {
                        viewModel.syncDataWithSpreadsheet { success, msg ->
                            Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                        }
                    },
                    enabled = inputUrl.trim().isNotEmpty() && syncStatus != "Sincronizando...",
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    modifier = Modifier.testTag("sync_action_button")
                ) {
                    Icon(imageVector = Icons.Default.Sync, contentDescription = "Sincronizar")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Sincronizar ahora")
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Expandable how-to instructions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expandedHelp = !expandedHelp }
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Instrucciones de configuración",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Icon(
                    imageVector = if (expandedHelp) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = "Expandir"
                )
            }

            if (expandedHelp) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 24.dp)
                ) {
                    Text(
                        text = "Sigue estos pasos rápidos:\n" +
                                "1. Crea un nuevo archivo de Google Sheets.\n" +
                                "2. Ve a 'Extensiones' > 'Apps Script'.\n" +
                                "3. Borra el código por defecto y copia el script completo que verás abajo.\n" +
                                "4. Haz clic en 'Implementar' > 'Nueva implementación'.\n" +
                                "5. Selecciona el tipo de implementación 'Aplicación Web'.\n" +
                                "6. En 'Quién tiene acceso', selecciona 'Cualquiera' (imprescindible para permitir llamadas desde el móvil).\n" +
                                "7. Copia la URL de la aplicación web generada y pégala arriba.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 22.sp
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "CÓDIGO DE GOOGLE APPS SCRIPT",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                        TextButton(
                            onClick = {
                                clipboardManager.setText(AnnotatedString(scriptCodeCode))
                                Toast.makeText(context, "Código copiado", Toast.LENGTH_SHORT).show()
                            }
                        ) {
                            Icon(imageVector = Icons.Default.ContentCopy, contentDescription = "Copiar", modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Copiar código", fontSize = 12.sp)
                        }
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Text(
                            text = scriptCodeCode,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.horizontalScroll(rememberScrollState())
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
