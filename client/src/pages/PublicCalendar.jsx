import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  LayoutGrid,
} from "lucide-react";
import api from "../api";
import EventCard from "../components/EventCard";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "TERMINATED",
];

const STATUS_COLORS = {
  PENDING: "#d99a00",
  ONGOING: "#2f74c0",
  COMPLETED: "#218653",
  CANCELLED: "#c44242",
  TERMINATED: "#6c757d",
};

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getStart(event) {
  return safeDate(event?.startAt ?? event?.start ?? event?.startDate);
}

function getEnd(event) {
  return safeDate(event?.endAt ?? event?.end ?? event?.endDate);
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthCells(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstCell = new Date(year, month, 1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(firstCell);
    current.setDate(firstCell.getDate() + index);
    return current;
  });
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDay(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function PublicCalendar() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/public/events");
        const payload =
          response?.data?.events ??
          response?.data?.data?.events ??
          response?.data?.data ??
          response?.data ??
          [];

        if (active) {
          setEvents(Array.isArray(payload) ? payload : []);
        }
      } catch (requestError) {
        console.error("Failed to load public events:", requestError);

        if (active) {
          setEvents([]);
          setError(
            requestError?.response?.data?.message ||
              "Unable to load the public calendar."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (Array.isArray(events) ? events : [])
      .filter((event) => event && typeof event === "object")
      .filter((event) => {
        const eventStatus = String(event.status ?? "").toUpperCase();
        const matchesStatus = status === "ALL" || eventStatus === status;

        const searchable = [
          event.title,
          event.department,
          event.location,
          event.description,
        ]
          .filter(Boolean)
          .map(String)
          .join(" ")
          .toLowerCase();

        return (
          matchesStatus &&
          (normalizedQuery === "" || searchable.includes(normalizedQuery))
        );
      })
      .sort((a, b) => (getStart(a)?.getTime() ?? 0) - (getStart(b)?.getTime() ?? 0));
  }, [events, query, status]);

  const calendarDays = useMemo(() => monthCells(cursorDate), [cursorDate]);

  function eventsForDay(day) {
    return filteredEvents.filter((event) => {
      const start = getStart(event);
      const end = getEnd(event) ?? start;
      if (!start) return false;

      return start <= endOfDay(day) && end >= startOfDay(day);
    });
  }

  function eventsForMonth(monthIndex) {
    return filteredEvents.filter((event) => {
      const start = getStart(event);
      return (
        start &&
        start.getFullYear() === cursorDate.getFullYear() &&
        start.getMonth() === monthIndex
      );
    });
  }

  const dayEvents = useMemo(
    () => eventsForDay(cursorDate),
    [filteredEvents, cursorDate]
  );

  function move(direction) {
    setSelectedEvent(null);
    setCursorDate((current) => {
      const next = new Date(current);

      if (view === "day") next.setDate(next.getDate() + direction);
      if (view === "month") next.setMonth(next.getMonth() + direction);
      if (view === "year") next.setFullYear(next.getFullYear() + direction);

      return next;
    });
  }

  function openMonth(monthIndex) {
    setCursorDate(new Date(cursorDate.getFullYear(), monthIndex, 1));
    setView("month");
    setSelectedEvent(null);
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>Argo Labs</strong>
            <span>Events &amp; Operations Calendar</span>
          </div>
        </div>

        <Link className="ghost" to="/login">
          Staff sign in
        </Link>
      </header>

      <section className="hero">
        <span className="eyebrow">PUBLIC SCHEDULE</span>
        <h1>Company events in one clear calendar.</h1>
        <p>
          Browse schedules by day, month, or year. Select an event to see its
          complete details.
        </p>
      </section>

      <section className="calendar-panel">
        <div className="calendar-toolbar">
          <div className="calendar-view-switcher">
            <button
              type="button"
              className={view === "day" ? "active" : ""}
              onClick={() => setView("day")}
            >
              <List size={16} />
              Day
            </button>

            <button
              type="button"
              className={view === "month" ? "active" : ""}
              onClick={() => setView("month")}
            >
              <CalendarDays size={16} />
              Month
            </button>

            <button
              type="button"
              className={view === "year" ? "active" : ""}
              onClick={() => setView("year")}
            >
              <LayoutGrid size={16} />
              Year
            </button>
          </div>

          <div className="calendar-navigation">
            <button
              type="button"
              className="calendar-icon-button"
              onClick={() => move(-1)}
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              className="calendar-today"
              onClick={() => {
                setCursorDate(new Date());
                setSelectedEvent(null);
              }}
            >
              Today
            </button>

            <button
              type="button"
              className="calendar-icon-button"
              onClick={() => move(1)}
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="calendar-title">
            {view === "day"
              ? formatDay(cursorDate)
              : view === "month"
                ? formatMonth(cursorDate)
                : cursorDate.getFullYear()}
          </h2>
        </div>

        <div className="calendar-filters">
          <input
            type="search"
            placeholder="Search title, department, or location"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="empty">Loading calendar…</div>
        ) : error ? (
          <div className="empty">{error}</div>
        ) : view === "month" ? (
          <div className="month-calendar">
            <div className="month-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="month-grid">
              {calendarDays.map((day) => {
                const dayEvents = eventsForDay(day);
                const outside = day.getMonth() !== cursorDate.getMonth();
                const today = sameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={[
                      "month-cell",
                      outside ? "outside-month" : "",
                      today ? "today-cell" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className="month-day-number"
                      onClick={() => {
                        setCursorDate(day);
                        setView("day");
                      }}
                    >
                      {day.getDate()}
                    </button>

                    <div className="month-event-list">
                      {dayEvents.slice(0, 3).map((event, index) => {
                        const eventStatus = String(
                          event.status ?? "PENDING"
                        ).toUpperCase();

                        return (
                          <button
                            type="button"
                            className="calendar-event-pill"
                            key={event?._id ?? event?.id ?? `${day}-${index}`}
                            style={{
                              "--event-color":
                                STATUS_COLORS[eventStatus] ??
                                STATUS_COLORS.PENDING,
                            }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <span />
                            {event.title || "Untitled event"}
                          </button>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          className="month-more"
                          onClick={() => {
                            setCursorDate(day);
                            setView("day");
                          }}
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "day" ? (
          <div className="day-calendar">
            {dayEvents.length > 0 ? (
              dayEvents.map((event, index) => {
                const start = getStart(event);
                const end = getEnd(event);
                const eventStatus = String(
                  event.status ?? "PENDING"
                ).toUpperCase();

                return (
                  <button
                    type="button"
                    className="day-event-row"
                    key={event?._id ?? event?.id ?? `event-${index}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="day-event-time">
                      <strong>{start ? formatTime(start) : "Time TBD"}</strong>
                      {end && <span>{formatTime(end)}</span>}
                    </div>

                    <div
                      className="day-event-accent"
                      style={{
                        "--event-color":
                          STATUS_COLORS[eventStatus] ?? STATUS_COLORS.PENDING,
                      }}
                    />

                    <div className="day-event-content">
                      <h3>{event.title || "Untitled event"}</h3>
                      <p>
                        {[event.department, event.location]
                          .filter(Boolean)
                          .join(" • ") || "No department or location"}
                      </p>
                    </div>

                    <span className={`status status-${eventStatus.toLowerCase()}`}>
                      {eventStatus}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="empty">No events scheduled for this day.</div>
            )}
          </div>
        ) : (
          <div className="year-calendar">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthDate = new Date(
                cursorDate.getFullYear(),
                monthIndex,
                1
              );
              const monthEvents = eventsForMonth(monthIndex);

              return (
                <button
                  type="button"
                  className="year-month-card"
                  key={monthIndex}
                  onClick={() => openMonth(monthIndex)}
                >
                  <div className="year-month-header">
                    <strong>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "long",
                      }).format(monthDate)}
                    </strong>
                    <span>{monthEvents.length} event(s)</span>
                  </div>

                  <div className="year-month-events">
                    {monthEvents.slice(0, 4).map((event, index) => {
                      const eventStatus = String(
                        event.status ?? "PENDING"
                      ).toUpperCase();

                      return (
                        <span key={event?._id ?? event?.id ?? index}>
                          <i
                            style={{
                              "--event-color":
                                STATUS_COLORS[eventStatus] ??
                                STATUS_COLORS.PENDING,
                            }}
                          />
                          {event.title || "Untitled event"}
                        </span>
                      );
                    })}

                    {monthEvents.length === 0 && <em>No events</em>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="selected-event-section">
        <div className="section-heading">
          <span className="eyebrow">EVENT DETAILS</span>
          <h2>
            {selectedEvent
              ? selectedEvent.title || "Selected event"
              : "Select an event"}
          </h2>
          <p>
            {selectedEvent
              ? "Full information for the selected schedule."
              : "Click an event title in the calendar to display its details."}
          </p>
        </div>

        {selectedEvent ? (
          <EventCard event={selectedEvent} />
        ) : (
          <div className="empty">No event selected.</div>
        )}
      </section>
    </div>
  );
}
