package com.vfarms.resort.data

import com.vfarms.resort.BuildConfig
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

data class PropertyDto(
    val name: String? = null,
    val tagline: String? = null,
    val location: String? = null,
    val description: String? = null,
)

data class RoomsResponse(val rooms: List<RoomDto> = emptyList(), val notice: String? = null)
data class RoomDto(
    val slug: String? = null,
    val name: String? = null,
    val image: String? = null,
    val bookable: Boolean? = false,
    val summary: String? = null,
    val notice: String? = null,
)

data class GalleryResponse(val items: List<GalleryItemDto> = emptyList(), val note: String? = null)
data class GalleryItemDto(val src: String? = null, val alt: String? = null)

data class FaqsResponse(val faqs: List<FaqDto> = emptyList())
data class FaqDto(val q: String? = null, val a: String? = null)

data class AvailabilityRequest(
    val product: String,
    val startDate: String,
    val endDate: String,
    val guests: Int? = null,
)

data class AvailabilityResponse(
    val available: Boolean? = null,
    val reason: String? = null,
    val capacityConfigured: Boolean? = null,
)

data class QuoteRequest(val checkIn: String, val checkOut: String, val guests: Int)
data class QuoteResponse(
    val available: Boolean? = null,
    val bookingEnabled: Boolean? = null,
    val reason: String? = null,
    val availabilityReason: String? = null,
    val totalMinor: Long? = null,
    val dueNowMinor: Long? = null,
    val nights: Int? = null,
)

data class HoldRequest(
    val checkIn: String,
    val checkOut: String,
    val guests: Int,
    val fullName: String,
    val email: String,
    val phone: String,
    val specialRequests: String? = null,
    val acceptPolicies: Boolean = true,
)

data class HoldResponse(val ok: Boolean? = null, val error: String? = null, val booking: BookingDto? = null)
data class BookingDto(
    val reference: String? = null,
    val status: String? = null,
    val checkIn: String? = null,
    val checkOut: String? = null,
    val guests: Int? = null,
)

data class EnquiryRequest(
    val fullName: String,
    val email: String,
    val phone: String,
    val eventType: String,
    val startDate: String,
    val endDate: String,
    val expectedAttendees: Int? = null,
    val setupRequirements: String? = null,
    val vendorRequests: String? = null,
    val notes: String? = null,
)

data class EnquiryResponse(val reference: String? = null, val status: String? = null, val message: String? = null)

data class ContactRequest(val name: String, val email: String, val phone: String? = null, val message: String)
data class ContactResponse(val ok: Boolean? = null, val notice: String? = null, val error: String? = null)

data class PaymentOrderRequest(val stayReference: String? = null, val quoteReference: String? = null)
data class PaymentOrderResponse(
    val orderId: String? = null,
    val amount: Long? = null,
    val currency: String? = null,
    val error: String? = null,
    val code: String? = null,
)

data class PaymentStatusResponse(
    val reference: String? = null,
    val paymentStatus: String? = null,
    val reservationStatus: String? = null,
    val exception: String? = null,
)

interface VFarmsApi {
    @GET("api/public/property")
    suspend fun property(): PropertyDto

    @GET("api/public/rooms")
    suspend fun rooms(): RoomsResponse

    @GET("api/public/gallery")
    suspend fun gallery(): GalleryResponse

    @GET("api/public/faqs")
    suspend fun faqs(): FaqsResponse

    @POST("api/availability/search")
    suspend fun availability(@Body body: AvailabilityRequest): AvailabilityResponse

    @POST("api/pricing/quote")
    suspend fun quote(@Body body: QuoteRequest): QuoteResponse

    @POST("api/bookings/holds")
    suspend fun hold(@Body body: HoldRequest): HoldResponse

    @GET("api/bookings/{reference}")
    suspend fun booking(@Path("reference") reference: String): BookingDto

    @POST("api/events/enquiries")
    suspend fun enquiry(@Body body: EnquiryRequest): EnquiryResponse

    @POST("api/contact")
    suspend fun contact(@Body body: ContactRequest): ContactResponse

    @POST("api/payments/orders")
    suspend fun paymentOrder(@Body body: PaymentOrderRequest): PaymentOrderResponse

    @GET("api/payments/{reference}/status")
    suspend fun paymentStatus(@Path("reference") reference: String): PaymentStatusResponse
}

object ApiModule {
    fun api(): VFarmsApi {
        val client = OkHttpClient.Builder()
            .callTimeout(30, TimeUnit.SECONDS)
            .build()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(VFarmsApi::class.java)
    }
}
