export const BRAND = {
  name: "V-Farms",
  tagline: "A singular escape to nature",
  location: "Near Hyderabad, Telangana",
  property: "A private five-acre dragon fruit farm near Hyderabad for exclusive stays and memorable gatherings.",
  roomNotice:
    "Five distinct rooms. One exclusive estate booking. Every eligible stay includes all five rooms.",
  mediaNote:
    "Photography is taken from the V-Farms resort video. Stills were upscaled and colour-graded for presentation. They are not native 4K footage or genuine HDR.",
} as const;

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/estate", label: "The Estate" },
  { href: "/rooms", label: "Rooms" },
  { href: "/stays", label: "Stays" },
  { href: "/events", label: "Events" },
  { href: "/experiences", label: "Experiences" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/estate", label: "The Estate" },
  { href: "/rooms", label: "Rooms" },
  { href: "/stays", label: "Stays" },
  { href: "/experiences", label: "Experiences" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const GALLERY = [
  { src: "/images/estate/vfarms_4k_hdr_style_01.jpg", alt: "Aerial view of V-Farms at sunset across surrounding farmland." },
  { src: "/images/estate/vfarms_4k_hdr_style_02.jpg", alt: "Wide aerial sunset over the V-Farms landscape." },
  { src: "/images/estate/vfarms_4k_hdr_style_03.jpg", alt: "Guest building and trees at V-Farms from above." },
  { src: "/images/estate/vfarms_4k_hdr_style_04.jpg", alt: "Interior gathering space at the V-Farms guest building." },
  { src: "/images/estate/vfarms_4k_hdr_style_05.jpg", alt: "Covered outdoor terrace at V-Farms." },
  { src: "/images/estate/vfarms_4k_hdr_style_06.jpg", alt: "Open courtyard with palm trees on the estate." },
  { src: "/images/estate/vfarms_4k_hdr_style_07.jpg", alt: "Aerial of the guest building set among fields." },
  { src: "/images/estate/vfarms_4k_hdr_style_08.jpg", alt: "Closer aerial of the V-Farms buildings and planted areas." },
  { src: "/images/estate/vfarms_4k_hdr_style_09.jpg", alt: "Morning aerial of V-Farms and neighbouring farmland." },
  { src: "/images/estate/vfarms_4k_hdr_style_10.jpg", alt: "Elevated view of the estate among agricultural land." },
  { src: "/images/estate/vfarms_4k_hdr_style_11.jpg", alt: "Night view of the estate outline with existing lighting." },
  { src: "/images/estate/vfarms_4k_hdr_style_12.jpg", alt: "Night aerial of the V-Farms guest building." },
] as const;

/**
 * The supplied resort video and graded stills do not show five distinct bedrooms.
 * Confirmed interiors in footage: dining/gathering hall, covered terrace, courtyard, building exteriors.
 * Working titles below are unpublished design directions until the owner approves names and photographs.
 */
export const ROOMS = [
  {
    slug: "room-1",
    name: "Room 1",
    workingTitle: "The Garden Retreat",
    designDirection: "A serene retreat with a light, nature-inspired feel.",
    photographPublished: false,
    image: null,
  },
  {
    slug: "room-2",
    name: "Room 2",
    workingTitle: "The Modern Suite",
    designDirection: "Contemporary comfort with clean lines and understated elegance.",
    photographPublished: false,
    image: null,
  },
  {
    slug: "room-3",
    name: "Room 3",
    workingTitle: "The Nature Room",
    designDirection: "A fresh, light-filled space inspired by the surrounding landscape.",
    photographPublished: false,
    image: null,
  },
  {
    slug: "room-4",
    name: "Room 4",
    workingTitle: "The Warm Luxe Room",
    designDirection: "Warm lighting and thoughtful details create a relaxed, intimate mood.",
    photographPublished: false,
    image: null,
  },
  {
    slug: "room-5",
    name: "Room 5",
    workingTitle: "The Signature Room",
    designDirection: "A characterful space with its own distinctive visual identity.",
    photographPublished: false,
    image: null,
  },
] as const;

export type RoomProfile = {
  slug: string;
  name: string;
  workingTitle: string;
  designDirection: string;
  photographPublished: boolean;
  image: string | null;
  publishedSummary?: string;
};

export const FAQS = [
  {
    q: "Can I book a single room?",
    a: "No. V-Farms is reserved as one exclusive property. All five rooms are included in an eligible whole-property stay. Individual rooms cannot be booked, priced, or checked out separately.",
  },
  {
    q: "Where is V-Farms?",
    a: "V-Farms is a five-acre dragon fruit farm near Hyderabad, Telangana. A precise postal address and map pin will be published after the owner confirms them.",
  },
  {
    q: "What is the overnight guest capacity?",
    a: "Maximum overnight occupancy is not confirmed. The stay form will enforce the configured limit once the owner publishes it.",
  },
  {
    q: "What are the stay rates?",
    a: "Whole-property nightly rates, taxes, and deposits are not configured. Online checkout stays disabled until the owner publishes rates.",
  },
  {
    q: "What are check-in and check-out times?",
    a: "Arrival and departure times have not been decided. They will appear in the stay policy once the owner sets them.",
  },
  {
    q: "How do private events work?",
    a: "Submit an enquiry with dates, event type, and expected attendance. An enquiry is not a booking. The owner reviews feasibility, may issue a quote, and confirmation requires quote acceptance plus verified payment when payments are enabled.",
  },
  {
    q: "Do event enquiries block other guests?",
    a: "No. Unapproved enquiries do not hold the calendar. Only approved quotes that successfully acquire a property hold, confirmed stays, and maintenance closures occupy inventory.",
  },
  {
    q: "How do I contact V-Farms?",
    a: "A booking phone number and email are not provided yet. Use the contact form on this website. Messages are stored for the owner; email delivery occurs only when an email provider is configured.",
  },
] as const;

export const POLICIES = {
  privacy: {
    title: "Privacy policy",
    body: `V-Farms collects only the information needed to respond to enquiries and, when booking is enabled, to complete a reservation. Guest name, email, phone, dates, and requests may be stored. Payment card numbers and CVVs are never stored by V-Farms; card processing is handled by Razorpay when configured. Staff access is role-restricted. This page is an operational draft, not a legal certification. A qualified reviewer should approve the final policy before launch.`,
  },
  terms: {
    title: "Terms of stay",
    body: `A V-Farms stay is an exclusive whole-property reservation. It includes the five guest rooms as a single unit. Individual-room sales are not offered. Check-in times, occupancy, rates, identification requirements, and house rules will be the versions published at checkout once the owner configures them. A confirmed stay requires a valid property inventory allocation and verified payment, or an audited manual confirmation by authorised staff.`,
  },
  cancellation: {
    title: "Cancellation policy",
    body: `Cancellation and refund rules are not yet published by the owner. Until a policy version is approved, the website will not promise refund timelines. If a payment is captured in error or after a hold expires, it is raised as an operations exception rather than silently confirmed.`,
  },
  events: {
    title: "Event terms",
    body: `Private events occupy the entire property. Submitting an enquiry does not reserve dates. Overnight room use, catering, décor, and vendors are not included unless an issued quote says so. Under the conservative MVP rule, an event cannot share a calendar date with a stay, including arrival and departure dates. Required permits, noise limits, and insurance remain the organiser’s and owner’s responsibility and are not certified by this website.`,
  },
} as const;
