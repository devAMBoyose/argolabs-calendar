# Google Form setup

Create the form under the HR owner account and use these titles exactly:

| Question title | Type | Required |
|---|---|---|
| Event Title | Short answer | Yes |
| Department | Dropdown | Yes |
| Date | Date | Yes |
| Start Time | Time | Yes |
| End Time | Time | Yes |
| Location | Short answer | No |
| Guest Emails | Paragraph | No |
| Priority | Dropdown: NORMAL, HIGH, URGENT | Yes |
| Description | Paragraph | No |
| Remarks | Paragraph | No |
| Reminder Minutes | Dropdown: 10, 15, 30, 60, 1440 | No |
| Publish Publicly | Multiple choice: Yes, No | Yes |

Then:

1. Connect the form to a Google response spreadsheet.
2. Open the response spreadsheet.
3. Select **Extensions → Apps Script**.
4. Copy `apps-script/Code.gs` and `appsscript.json` into that project.
5. Replace `WEBHOOK_URL` and `WEBHOOK_SECRET` in `Code.gs`.
6. Open **Triggers → Add Trigger**.
7. Function: `onFormSubmit`; event source: **From spreadsheet**; event type: **On form submit**.
8. Authorize the script.
9. Run `testWebhook()` after the backend is deployed and Google Calendar is connected.
