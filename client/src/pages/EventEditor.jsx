import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";

const MANILA_TIME_ZONE = "Asia/Manila";
const MANILA_UTC_OFFSET = "+08:00";

const initial = {
    title: "",
    description: "",
    department: "HR",
    location: "",
    startAt: "",
    endAt: "",
    attendees: "",
    priority: "NORMAL",
    status: "PENDING",
    remarks: "",
    isPublic: true,
    reminderMinutes: 30,
};

/**
 * Converts a UTC/ISO timestamp returned by the API into the exact
 * Asia/Manila value required by <input type="datetime-local">.
 *
 * Example:
 * 2026-07-27T12:40:00.000Z
 * becomes:
 * 2026-07-27T20:40
 */
function utcToManilaInput(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MANILA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/**
 * Treats a datetime-local value as Philippine time and converts it
 * into a UTC ISO timestamp before sending it to the server.
 *
 * Example:
 * 2026-07-27T20:40
 * becomes:
 * 2026-07-27T12:40:00.000Z
 */
function manilaInputToUtc(value) {
    if (!value) return "";

    const normalizedValue =
        value.length === 16 ? `${value}:00` : value;

    const date = new Date(
        `${normalizedValue}${MANILA_UTC_OFFSET}`
    );

    if (Number.isNaN(date.getTime())) {
        throw new Error("Invalid Philippine date and time.");
    }

    return date.toISOString();
}

export default function EventEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isOwner, canEdit } = useAuth();

    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function loadEvent() {
            try {
                setLoading(true);
                setError("");

                const { data } = await api.get(`/events/${id}`);
                const event = data.event;

                if (cancelled) return;

                setForm({
                    ...initial,
                    ...event,

                    attendees: Array.isArray(event.attendees)
                        ? event.attendees.join(",")
                        : "",

                    startAt: utcToManilaInput(event.startAt),
                    endAt: utcToManilaInput(event.endAt),

                    reminderMinutes: Number(
                        event.reminderMinutes ?? 30
                    ),

                    isPublic: Boolean(event.isPublic),
                });
            } catch (requestError) {
                if (cancelled) return;

                setError(
                    requestError.response?.data?.message ||
                    "Unable to load the event."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadEvent();

        return () => {
            cancelled = true;
        };
    }, [id]);

    function setField(key, value) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function save(event) {
        event.preventDefault();

        setSaving(true);
        setError("");

        try {
            const startAt = manilaInputToUtc(form.startAt);
            const endAt = manilaInputToUtc(form.endAt);

            if (!startAt || !endAt) {
                throw new Error(
                    "Start and end time are required."
                );
            }

            if (new Date(endAt) <= new Date(startAt)) {
                throw new Error(
                    "End time must be after start time."
                );
            }

            const payload = {
                ...form,

                startAt,
                endAt,

                attendees: String(form.attendees || "")
                    .split(",")
                    .map((email) => email.trim())
                    .filter(Boolean),

                reminderMinutes: Number(
                    form.reminderMinutes
                ),

                isPublic: Boolean(form.isPublic),
            };

            if (id) {
                await api.patch(`/events/${id}`, payload);
            } else {
                await api.post("/events", payload);
            }

            navigate("/dashboard");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to save event."
            );
        } finally {
            setSaving(false);
        }
    }

    async function remove() {
        const confirmed = window.confirm(
            "Delete this event from the portal and Google Calendar?"
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setError("");

            await api.delete(`/events/${id}`);
            navigate("/dashboard");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to delete the event."
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="empty">
                Loading event…
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <span className="eyebrow">
                        {id ? "EVENT RECORD" : "NEW EVENT"}
                    </span>

                    <h1>
                        {id ? "Update event" : "Create event"}
                    </h1>

                    <p>
                        {isOwner
                            ? "You can manage all event details."
                            : "You can update only status and remarks."}
                    </p>
                </div>
            </div>

            <form
                className="form-card"
                onSubmit={save}
            >
                {error && (
                    <div className="alert error">
                        {error}
                    </div>
                )}

                <div className="form-grid">
                    <label>
                        Event title

                        <input
                            required
                            disabled={!isOwner}
                            value={form.title}
                            onChange={(event) =>
                                setField(
                                    "title",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        Department

                        <select
                            disabled={!isOwner}
                            value={form.department}
                            onChange={(event) =>
                                setField(
                                    "department",
                                    event.target.value
                                )
                            }
                        >
                            {[
                                "HR",
                                "Finance and Accounting",
                                "Operations",
                                "Sales and Marketing",
                                "Warehouse",
                                "Management",
                                "IT and Systems",
                                "General",
                            ].map((department) => (
                                <option
                                    key={department}
                                    value={department}
                                >
                                    {department}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Start

                        <input
                            type="datetime-local"
                            required
                            disabled={!isOwner}
                            value={form.startAt}
                            onChange={(event) =>
                                setField(
                                    "startAt",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        End

                        <input
                            type="datetime-local"
                            required
                            disabled={!isOwner}
                            value={form.endAt}
                            onChange={(event) =>
                                setField(
                                    "endAt",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        Location

                        <input
                            disabled={!isOwner}
                            value={form.location || ""}
                            onChange={(event) =>
                                setField(
                                    "location",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        Priority

                        <select
                            disabled={!isOwner}
                            value={form.priority}
                            onChange={(event) =>
                                setField(
                                    "priority",
                                    event.target.value
                                )
                            }
                        >
                            {[
                                "NORMAL",
                                "HIGH",
                                "URGENT",
                            ].map((priority) => (
                                <option
                                    key={priority}
                                    value={priority}
                                >
                                    {priority}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="full">
                        Guest emails

                        <textarea
                            disabled={!isOwner}
                            value={form.attendees}
                            onChange={(event) =>
                                setField(
                                    "attendees",
                                    event.target.value
                                )
                            }
                            placeholder="name@company.com, another@company.com"
                        />
                    </label>

                    <label className="full">
                        Description

                        <textarea
                            disabled={!isOwner}
                            value={form.description || ""}
                            onChange={(event) =>
                                setField(
                                    "description",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        Status

                        <select
                            disabled={!canEdit}
                            value={form.status}
                            onChange={(event) =>
                                setField(
                                    "status",
                                    event.target.value
                                )
                            }
                        >
                            {[
                                "PENDING",
                                "ONGOING",
                                "COMPLETED",
                                "CANCELLED",
                                "TERMINATED",
                            ].map((status) => (
                                <option
                                    key={status}
                                    value={status}
                                >
                                    {status}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Reminder

                        <select
                            disabled={!isOwner}
                            value={form.reminderMinutes}
                            onChange={(event) =>
                                setField(
                                    "reminderMinutes",
                                    Number(event.target.value)
                                )
                            }
                        >
                            {[10, 15, 30, 60, 1440].map(
                                (minutes) => (
                                    <option
                                        key={minutes}
                                        value={minutes}
                                    >
                                        {minutes === 1440
                                            ? "1 day"
                                            : `${minutes} minutes`}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label className="full">
                        Remarks

                        <textarea
                            disabled={!canEdit}
                            value={form.remarks || ""}
                            onChange={(event) =>
                                setField(
                                    "remarks",
                                    event.target.value
                                )
                            }
                            placeholder="Operational update, completion note, reason for cancellation…"
                        />
                    </label>

                    {isOwner && (
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={Boolean(
                                    form.isPublic
                                )}
                                onChange={(event) =>
                                    setField(
                                        "isPublic",
                                        event.target.checked
                                    )
                                }
                            />

                            Publish on public calendar
                        </label>
                    )}
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="ghost"
                        disabled={saving}
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        Cancel
                    </button>

                    {isOwner && id && (
                        <button
                            type="button"
                            className="danger"
                            disabled={saving}
                            onClick={remove}
                        >
                            Delete
                        </button>
                    )}

                    <button
                        type="submit"
                        className="primary"
                        disabled={saving}
                    >
                        {saving
                            ? "Saving…"
                            : "Save event"}
                    </button>
                </div>
            </form>
        </>
    );
}

<p style={{ color: "#0a7a5c", fontWeight: 700 }}>
    Manila timezone build 2026-07-27
</p>