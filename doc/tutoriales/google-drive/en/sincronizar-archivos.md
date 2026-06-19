# Sync files

**Prerequisites:** a connected Google account and a selected working folder.
**Estimated time:** 1 minute.

## Steps

1. Open **Settings > Connectors > Google Drive**.
2. In the **Synchronization** section you'll see the date of the last sync.
3. Click **Sync** to bring the current state of the files from Google Drive.
4. Review the list of **Managed files**: each file shows its status (Synced, Conflict or Pending sync).
5. If a conflict warning appears, decide which version to keep before continuing to work.

## Expected result

The last sync date is updated and each managed file shows its status. If there are no conflicts, they all appear as **Synced**.

## FAQ

**When does the app sync?**
When you open the project the app reconciles its state with Google Drive, and you can force a manual sync at any time with the **Sync** button, without restarting the app.

**Which version wins if there are differences?**
Google Drive is the source of truth: if only the Drive version changed, that one is adopted. If the app detects that you had more recent local changes, it marks the file as **Conflict** and lets you decide.

**What does the "Pending sync" status mean?**
That the app has written changes that have not yet been reconciled with Drive in a sync. Click **Sync** to resolve it.

**Can I edit the files directly in Google?**
You can, but respect the areas marked as managed by the app (the cover page and the data block): the app regenerates them and your manual edits in those areas would be lost.
