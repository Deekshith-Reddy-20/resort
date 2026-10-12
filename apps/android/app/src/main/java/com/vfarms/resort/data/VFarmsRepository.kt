package com.vfarms.resort.data

class VFarmsRepository(private val api: VFarmsApi = ApiModule.api()) {
    suspend fun property() = api.property()
    suspend fun rooms() = api.rooms()
    suspend fun gallery() = api.gallery()
    suspend fun faqs() = api.faqs()
    suspend fun availability(product: String, start: String, end: String, guests: Int?) =
        api.availability(AvailabilityRequest(product, start, end, guests))
    suspend fun quote(checkIn: String, checkOut: String, guests: Int) =
        api.quote(QuoteRequest(checkIn, checkOut, guests))
    suspend fun hold(request: HoldRequest) = api.hold(request)
    suspend fun booking(reference: String) = api.booking(reference)
    suspend fun enquiry(request: EnquiryRequest) = api.enquiry(request)
    suspend fun contact(request: ContactRequest) = api.contact(request)
    suspend fun paymentOrder(stayReference: String) = api.paymentOrder(PaymentOrderRequest(stayReference = stayReference))
    suspend fun paymentStatus(reference: String) = api.paymentStatus(reference)
}
