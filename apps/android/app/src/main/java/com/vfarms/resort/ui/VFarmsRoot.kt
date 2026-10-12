package com.vfarms.resort.ui

import android.app.DatePickerDialog
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.vfarms.resort.BuildConfig
import com.vfarms.resort.data.EnquiryRequest
import com.vfarms.resort.data.HoldRequest
import com.vfarms.resort.data.ContactRequest
import com.vfarms.resort.data.SecureStore
import com.vfarms.resort.data.VFarmsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.util.Calendar

class HomeViewModel(
    private val repo: VFarmsRepository = VFarmsRepository(),
) : ViewModel() {
    data class Ui(
        val loading: Boolean = true,
        val error: String? = null,
        val title: String = "V-Farms",
        val tagline: String = "A singular escape to nature",
        val location: String = "Near Hyderabad, Telangana",
        val body: String = "",
        val roomsNotice: String = "",
        val gallery: List<Pair<String, String>> = emptyList(),
        val rooms: List<Triple<String, String, String>> = emptyList(),
        val faqs: List<Pair<String, String>> = emptyList(),
        val offline: Boolean = false,
    )
    private val _state = MutableStateFlow(Ui())
    val state: StateFlow<Ui> = _state

    fun load(baseUrl: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val property = repo.property()
                val rooms = repo.rooms()
                val gallery = repo.gallery()
                val faqs = repo.faqs()
                _state.value = Ui(
                    loading = false,
                    title = property.name ?: "V-Farms",
                    tagline = property.tagline ?: "A singular escape to nature",
                    location = property.location ?: "Near Hyderabad, Telangana",
                    body = property.description.orEmpty(),
                    roomsNotice = rooms.notice.orEmpty(),
                    gallery = gallery.items.map {
                        val src = it.src.orEmpty()
                        val url = if (src.startsWith("http")) src else baseUrl.trimEnd('/') + src
                        url to (it.alt ?: "V-Farms")
                    },
                    rooms = rooms.rooms.map { Triple(it.slug.orEmpty(), it.name.orEmpty(), it.image.orEmpty()) },
                    faqs = faqs.faqs.map { (it.q ?: "") to (it.a ?: "") },
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Unable to reach V-Farms.", offline = true)
            }
        }
    }
}

class StayViewModel(private val repo: VFarmsRepository = VFarmsRepository()) : ViewModel() {
    var message by mutableStateOf<String?>(null)
    var loading by mutableStateOf(false)
    fun search(checkIn: String, checkOut: String, guests: Int) {
        viewModelScope.launch {
            loading = true
            message = try {
                val quote = repo.quote(checkIn, checkOut, guests)
                buildString {
                    append(if (quote.available == true) "Estate available. " else (quote.availabilityReason ?: "Unavailable. "))
                    append(quote.reason ?: "")
                    if (quote.totalMinor != null) append(" Total paise: ${quote.totalMinor}.")
                    else append(" Rates are not published.")
                }
            } catch (e: Exception) {
                e.message ?: "Search failed."
            }
            loading = false
        }
    }
    fun hold(request: HoldRequest, onRef: (String) -> Unit) {
        viewModelScope.launch {
            loading = true
            try {
                val result = repo.hold(request)
                val ref = result.booking?.reference
                if (ref != null) onRef(ref) else message = result.error ?: "Hold was not created."
            } catch (e: Exception) {
                message = e.message
            }
            loading = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VFarmsRoot() {
    val nav = rememberNavController()
    val context = LocalContext.current
    val store = remember { SecureStore(context) }
    var onboarded by remember { mutableStateOf(store.onboarded()) }
    if (!onboarded) {
        Onboarding(
            onSkip = {
                store.setOnboarded()
                onboarded = true
            },
        )
        return
    }
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("V-Farms") })
        },
        bottomBar = {
            NavigationBar {
                listOf("home" to "Home", "stay" to "Stay", "events" to "Events", "more" to "More").forEach { (route, label) ->
                    NavigationBarItem(
                        selected = false,
                        onClick = { nav.navigate(route) },
                        icon = { Text(label.take(1)) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(navController = nav, startDestination = "home", modifier = Modifier.padding(padding)) {
            composable("home") { HomeScreen(nav) }
            composable("estate") { EstateScreen() }
            composable("rooms") { RoomsScreen(nav) }
            composable("stay") { StayScreen(store) }
            composable("events") { EventsScreen() }
            composable("more") { MoreScreen(nav) }
            composable("faq") { FaqScreen() }
            composable("contact") { ContactScreen() }
            composable("settings") { SettingsScreen() }
            composable("gallery") { GalleryScreen() }
        }
    }
}

@Composable
private fun Onboarding(onSkip: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF09281F))
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("V-FARMS", color = Color(0xFFF8F5ED), style = MaterialTheme.typography.headlineLarge)
        Text("A singular escape to nature", color = Color(0xFFF8F5ED))
        Spacer(Modifier.height(16.dp))
        Text(
            "Exclusive whole-property stays. Private events by enquiry. Rooms cannot be booked individually.",
            color = Color(0xFFD9D2C4),
        )
        Spacer(Modifier.height(24.dp))
        Button(onClick = onSkip) { Text("Continue as guest") }
        TextButton(onClick = onSkip) { Text("Skip", color = Color.White) }
    }
}

@Composable
private fun HomeScreen(nav: NavHostController, vm: HomeViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) { vm.load(BuildConfig.API_BASE_URL) }
    when {
        state.loading -> Column(Modifier.padding(24.dp)) { CircularProgressIndicator() }
        state.error != null -> Column(Modifier.padding(24.dp)) {
            Text(state.error ?: "")
            Text("Offline. Browse cached brand information when the server is reachable.")
            Button(onClick = { vm.load(BuildConfig.API_BASE_URL) }) { Text("Retry") }
        }
        else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text(state.title, style = MaterialTheme.typography.headlineLarge)
                Text(state.tagline)
                Text(state.location, style = MaterialTheme.typography.bodySmall)
                Text(state.body, modifier = Modifier.padding(top = 8.dp))
            }
            item {
                Button(onClick = { nav.navigate("stay") }, modifier = Modifier.fillMaxWidth()) { Text("Plan Your Stay") }
                OutlinedButton(onClick = { nav.navigate("events") }, modifier = Modifier.fillMaxWidth()) { Text("Host an Event") }
            }
            items(state.gallery.take(4)) { (url, alt) ->
                AsyncImage(
                    model = url,
                    contentDescription = alt,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp),
                    contentScale = ContentScale.Crop,
                )
            }
            item {
                TextButton(onClick = { nav.navigate("estate") }) { Text("Explore the estate") }
                TextButton(onClick = { nav.navigate("rooms") }) { Text("Five rooms") }
            }
        }
    }
}

@Composable
private fun EstateScreen() {
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("The Estate", style = MaterialTheme.typography.headlineMedium)
        Text("A private five-acre dragon fruit farm near Hyderabad. Exact coordinates are not published.")
        Text("Schematic only: arrival, one guest building with five rooms, and the plantation visible in the resort video.")
    }
}

@Composable
private fun RoomsScreen(nav: NavHostController, vm: HomeViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) { if (state.rooms.isEmpty()) vm.load(BuildConfig.API_BASE_URL) }
    Column(Modifier.padding(16.dp)) {
        Text("Five rooms, one estate booking", style = MaterialTheme.typography.headlineSmall)
        Text(state.roomsNotice)
        state.rooms.forEach { room ->
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
                    .clickable { nav.navigate("stay") }
                    .semantics { contentDescription = "${room.second}. Included in whole-property stay. Not bookable alone." },
            ) {
                Text(room.second, style = MaterialTheme.typography.titleMedium)
                Text("Informational only. Opens the whole-property stay flow.")
            }
        }
        Button(onClick = { nav.navigate("stay") }) { Text("Plan the estate stay") }
    }
}

@Composable
private fun StayScreen(store: SecureStore, vm: StayViewModel = viewModel()) {
    val context = LocalContext.current
    var checkIn by remember { mutableStateOf("") }
    var checkOut by remember { mutableStateOf("") }
    var guests by remember { mutableStateOf("2") }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var paymentNote by remember { mutableStateOf<String?>(null) }

    fun pick(onDate: (String) -> Unit) {
        val cal = Calendar.getInstance()
        DatePickerDialog(context, { _, y, m, d ->
            onDate("%04d-%02d-%02d".format(y, m + 1, d))
        }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
    }

    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Whole-property stay", style = MaterialTheme.typography.headlineSmall)
        OutlinedButton(onClick = { pick { checkIn = it } }) { Text(if (checkIn.isEmpty()) "Check-in date" else checkIn) }
        OutlinedButton(onClick = { pick { checkOut = it } }) { Text(if (checkOut.isEmpty()) "Check-out date" else checkOut) }
        OutlinedTextField(value = guests, onValueChange = { guests = it.filter(Char::isDigit) }, label = { Text("Guests") })
        Button(onClick = { vm.search(checkIn, checkOut, guests.toIntOrNull() ?: 1) }, enabled = !vm.loading) { Text("Check availability") }
        vm.message?.let { Text(it) }
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full name") })
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") })
        OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") })
        Button(
            onClick = {
                vm.hold(
                    HoldRequest(checkIn, checkOut, guests.toIntOrNull() ?: 1, name, email, phone, acceptPolicies = true),
                ) {
                    store.saveBookingRef(it)
                    paymentNote = "Hold $it created. Payment must be verified on the server. The Razorpay Android SDK is not invoked until keys exist; a client callback never confirms the stay."
                }
            },
            enabled = !vm.loading,
        ) { Text("Request hold") }
        paymentNote?.let { Text(it) }
    }
}

@Composable
private fun EventsScreen(repo: VFarmsRepository = VFarmsRepository()) {
    var type by remember { mutableStateOf("") }
    var start by remember { mutableStateOf("") }
    var end by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var attendees by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Private event enquiry", style = MaterialTheme.typography.headlineSmall)
        Text("Submitting this form does not confirm a booking or hold dates.")
        OutlinedTextField(value = type, onValueChange = { type = it }, label = { Text("Event type") })
        OutlinedTextField(value = start, onValueChange = { start = it }, label = { Text("Start YYYY-MM-DD") })
        OutlinedTextField(value = end, onValueChange = { end = it }, label = { Text("End YYYY-MM-DD") })
        OutlinedTextField(value = attendees, onValueChange = { attendees = it }, label = { Text("Expected attendees") })
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") })
        OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") })
        Button(onClick = {
            scope.launch {
                message = try {
                    val result = repo.enquiry(
                        EnquiryRequest(
                            fullName = name,
                            email = email,
                            phone = phone,
                            eventType = type,
                            startDate = start,
                            endDate = end,
                            expectedAttendees = attendees.toIntOrNull(),
                        ),
                    )
                    result.message ?: "Enquiry ${result.reference} received."
                } catch (e: Exception) {
                    e.message
                }
            }
        }) { Text("Submit enquiry") }
        message?.let { Text(it) }
    }
}

@Composable
private fun MoreScreen(nav: NavHostController) {
    Column(Modifier.padding(16.dp)) {
        TextButton(onClick = { nav.navigate("gallery") }) { Text("Gallery") }
        TextButton(onClick = { nav.navigate("faq") }) { Text("FAQs") }
        TextButton(onClick = { nav.navigate("contact") }) { Text("Contact") }
        TextButton(onClick = { nav.navigate("settings") }) { Text("Settings") }
    }
}

@Composable
private fun GalleryScreen(vm: HomeViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) { if (state.gallery.isEmpty()) vm.load(BuildConfig.API_BASE_URL) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(state.gallery) { (url, alt) ->
            AsyncImage(model = url, contentDescription = alt, modifier = Modifier.fillMaxWidth().height(200.dp), contentScale = ContentScale.Crop)
        }
    }
}

@Composable
private fun FaqScreen(vm: HomeViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    LaunchedEffect(Unit) { if (state.faqs.isEmpty()) vm.load(BuildConfig.API_BASE_URL) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(state.faqs) { (q, a) ->
            Text(q, style = MaterialTheme.typography.titleMedium)
            Text(a)
        }
    }
}

@Composable
private fun ContactScreen(repo: VFarmsRepository = VFarmsRepository()) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<String?>(null) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val context = LocalContext.current
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Contact", style = MaterialTheme.typography.headlineSmall)
        Text("Phone and maps links will appear when the owner publishes them.")
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") })
        OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Message") })
        Button(onClick = {
            scope.launch {
                result = try {
                    repo.contact(ContactRequest(name, email, message = message)).notice ?: "Stored."
                } catch (e: Exception) {
                    e.message
                }
            }
        }) { Text("Send") }
        OutlinedButton(onClick = {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://maps.google.com/?q=Hyderabad")))
        }) { Text("Open Hyderabad map (unverified pin)") }
        result?.let { Text(it) }
    }
}

@Composable
private fun SettingsScreen() {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Settings", style = MaterialTheme.typography.headlineSmall)
        Text("Push notifications are not configured.")
        Text("App version 0.1.0")
        Text("Privacy and terms are loaded from the website.")
        Text("No guest account is required. Logout is unused until optional customer accounts exist.")
    }
}
