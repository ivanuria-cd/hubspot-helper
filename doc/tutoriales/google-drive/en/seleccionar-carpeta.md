# Select the working folder

**Prerequisites:** having connected your Google account (see "Connect Google Drive").
**Estimated time:** 1 minute.

## Steps

1. In **Settings > Connectors > Google Drive**, find the **Working folder** section.
2. Click **Select folder** (or **Change folder** if one was already set).
3. The app's folder picker opens. It starts at **My Drive**; click a folder to enter it and use the path at the top (breadcrumbs) to go back.
4. When you're inside the folder you want to use, click **Select this folder**.
5. The app will show the name of the chosen folder next to the folder icon.

## Expected result

The **Working folder** section shows the name of the selected folder and the **Synchronization** section is enabled.

## FAQ

**Can I change the folder later?**
Yes. Return to this screen and click **Change folder**. Keep in mind that managed files live inside the chosen folder.

**Will the app see other files that the folder already has?**
It will only manage the files it creates itself (internally marked as managed). The rest of the folder's content is left untouched.

**Do I need a Google API key?**
No. The picker is the app's own and browses your Drive with the OAuth permission only. To be able to list folders, the app asks for the Drive metadata read permission; that's why, when connecting, you'll see Google's consent screen again.

**I don't see my Shared Drives.**
This version of the picker browses "My Drive" only. Support for Shared Drives is planned as a future extension.
