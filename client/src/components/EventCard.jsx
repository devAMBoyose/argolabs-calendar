import React from "react";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function EventCard({ event, onClick }) {
  if (!event) return null;

  const status = String(event.status ?? "PENDING").toLowerCase();
  const priority = String(event.priority ?? "NORMAL").toLowerCase();
  const start = safeDate(event.startAt ?? event.start ?? event.startDate);
  const end = safeDate(event.endAt ?? event.end ?? event.endDate);
  const guestCount = Array.isArray(event.attendees)
    ? event.attendees.length
    : Array.isArray(event.guests)
      ? event.guests.length
      : 0;

  const content = (
    <>
      <div className="event-card-top">
        <span className={`status status-${status}`}>
          {String(event.status ?? "PENDING").toUpperCase()}
        </span>

        <span className={`priority priority-${priority}`}>
          {String(event.priority ?? "NORMAL").toUpperCase()}
        </span>
      </div>

      <h3>{event.title || "Untitled event"}</h3>
      <p>{event.description || "No additional description."}</p>

      <div className="event-meta">
        <span>
          <CalendarClock />
          {start
            ? `${format(start, "MMM d, yyyy • h:mm a")}${
                end ? ` – ${format(end, "MMM d, yyyy • h:mm a")}` : ""
              }`
            : "Date and time not available"}
        </span>

        {event.location && (
          <span>
            <MapPin />
            {event.location}
          </span>
        )}

        <span>
          <Users />
          {guestCount} guest(s)
        </span>
      </div>
    </>
  );

  return onClick ? (
    <button
      type="button"
      className="event-card"
      onClick={() => onClick(event)}
    >
      {content}
    </button>
  ) : (
    <article className="event-card event-card-static">{content}</article>
  );
}
