import { createModule } from "../sdk";

export const bookingModule = createModule({
  key: "booking",
  version: "1.0.0",
  name: "Appointment Booking",
  description:
    "Schedule service appointments, assign staff to slots, and manage client bookings — the book a salon, spa or studio runs its day from.",
  vertical: true,
  // `sales` for the customer/price vocabulary, `hr` because a booking is time
  // against a staff member. `core` is implicit but named for readability.
  requires: ["core", "hr", "sales"],
  permissions: [
    { key: "booking.view", label: "View bookings and the day's schedule", group: "Booking" },
    { key: "booking.manage", label: "Create, reschedule and cancel appointments", group: "Booking" },
    { key: "booking.staff", label: "Manage staff availability and assignments", group: "Booking" },
  ],
  navItems: [
    {
      href: "/owner/booking",
      label: "Bookings",
      iconKey: "calendar",
      group: "Service Operations",
      requires: "booking.view",
      sortOrder: 4,
    },
  ],
  dashboardWidgets: [
    {
      key: "booking_upcoming",
      title: "Upcoming appointments",
      requires: "booking.view",
      size: "panel",
      load: () =>
        import("@/components/dashboard/widgets/BookingWidgets").then((m) => ({
          default: m.UpcomingBookingsWidget,
        })),
      sortOrder: 15,
    },
  ],
});
