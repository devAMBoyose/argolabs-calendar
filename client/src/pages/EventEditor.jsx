import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api";
import { useAuth } from "../context/AuthContext";

const PHILIPPINE_OFFSET = "+08:00";

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
 * Convert a stored UTC ISO date into the value required by
 * <input type="datetime-local"> using Asia/Manila time.
 */
function toManilaInputValue(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/**
 * Convert a Philippine datetime-local value into UTC ISO format.
 *
 * Example:
 * 2026-07-27T19:57
 * becomes:
 * 2026-07-27T11:57:00.000Z
 */
function manilaInputToUtc(value) {
    if (!value) return "";

    const normalized = value.length === 16 ? `${value}:00` : value;
    const date = new Date(`${normalized}${PHILIPPINE_OFFSET}`);

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
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) return;

        api
            .get(`/events/${id}`)
            .then(({ data }) => {
                const event = data.event;

                setForm({
                    ...event,
                    attendees: (event.attendees || []).join(","),
                    startAt: toManilaInputValue(event.startAt),
                    endAt: toManilaInputValue(event.endAt),
                });
            })
            .catch((requestError) => {
                setError(
                    requestError.response?.data?.message ||
                    "Unable to load the event."
                );
            });
    }, [id]);

    function set(key, value) {
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
            const payload = {
                ...form,

                // Explicitly tell the backend these values are Philippine time.
                startAt: manilaInputToUtc(form.startAt),
                endAt: manilaInputToUtc(form.endAt),

                attendees: form.attendees
                    .split(",")
                    .map((email) => email.trim())
                    .filter(Boolean),
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
            await api.delete(`/events/${id}`);
            navigate("/dashboard");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to delete the event."
            );
        }
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <span className="eyebrow">
                        {id ? "EVENT RECORD" : "NEW EVENT"}
                    </span>

                    <h1>{id ? "Update event" : "Create event"}</h1>

                    <p>
                        {isOwner
                            ? "You can manage all event details."
                            : "You can update only status and remarks."}
                    </p>
                </div>
            </div>

            <form className="form-card" onSubmit={save}>
                {error && <div className="alert error">{error}</div>}

                <div className="form-grid">
                    <label>
                        Event title
                        <input
                            required
                            disabled={!isOwner}
                            value={form.title}
                            onChange={(event) => set("title", event.target.value)}
                        />
                    </label>

                    <label>
                        Department
                        <select
                            disabled={!isOwner}
                            value={form.department}
                            onChange={(event) =>
                                set("department", event.target.value)
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
                                <option key={department}>{department}</option>
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
                            onChange={(event) => set("startAt", event.target.value)}
                        />
                    </label>

                    <label>
                        End
                        <input
                            type="datetime-local"
                            required
                            disabled={!isOwner}
                            value={form.endAt}
                            onChange={(event) => set("endAt", event.target.value)}
                        />
                    </label>

                    <label>
                        Location
                        <input
                            disabled={!isOwner}
                            value={form.location || ""}
                            onChange={(event) => set("location", event.target.value)}
                        />
                    </label>

                    <label>
                        Priority
                        <select
                            disabled={!isOwner}
                            value={form.priority}
                            onChange={(event) =>
                                set("priority", event.target.value)
                            }
                        >
                            {["NORMAL", "HIGH", "URGENT"].map((priority) => (
                                <option key={priority}>{priority}</option>
                            ))}
                        </select>
                    </label>

                    <label className="full">
                        Guest emails
                        <textarea
                            disabled={!isOwner}
                            value={form.attendees}
                            onChange={(event) =>
                                set("attendees", event.target.value)
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
                                set("description", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        Status
                        <select
                            disabled={!canEdit}
                            value={form.status}
                            onChange={(event) => set("status", event.target.value)}
                        >
                            {[
                                "PENDING",
                                "ONGOING",
                                "COMPLETED",
                                "CANCELLED",
                                "TERMINATED",
                            ].map((status) => (
                                <option key={status}>{status}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Reminder
                        <select
                            disabled={!isOwner}
                            value={form.reminderMinutes}
                            onChange={(event) =>
                                set("reminderMinutes", Number(event.target.value))
                            }
                        >
                            {[10, 15, 30, 60, 1440].map((minutes) => (
                                <option key={minutes} value={minutes}>
                                    {minutes === 1440 ? "1 day" : `${minutes} minutes`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="full">
                        Remarks
                        <textarea
                            disabled={!canEdit}
                            value={form.remarks || ""}
                            onChange={(event) =>
                                set("remarks", event.target.value)
                            }
                            placeholder="Operational update, completion note, reason for cancellation…"
                        />
                    </label>

                    {isOwner && (
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={Boolean(form.isPublic)}
                                onChange={(event) =>
                                    set("isPublic", event.target.checked)
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
                        onClick={() => navigate("/dashboard")}
                    >
                        Cancel
                    </button>

                    {isOwner && id && (
                        <button
                            type="button"
                            className="danger"
                            onClick={remove}
                        >
                            Delete
                        </button>
                    )}

                    <button className="primary" disabled={saving}>
                        {saving ? "Saving…" : "Save event"}
                    </button>
                </div>
            </form>
        </>
    );
}