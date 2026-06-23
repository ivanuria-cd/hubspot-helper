# Import a project from a file

**Prerequisites:** have a previously exported `.rvproj` file.
**Estimated time:** 2 minutes

You can recreate a project on your machine from a `.rvproj` file.

## Steps

1. On the welcome screen, click **Import project**.
2. Select the `.rvproj` file and confirm.
3. Review the **preview summary**: name, referenced connectors and the content to be imported.
4. If a project with the same identifier already exists, choose **Create a copy** (default) or **Overwrite the existing one**.
5. Click **Import**.
6. After importing, reconnect **HubSpot** and **Google Drive** with your credentials.

## Expected result

The project appears in the list and opens, with its property map, custom objects and forms.

## FAQ

**Why do I have to reconnect the connectors?** Because the file contains no credentials for security; only references to the portal and the folder.

**What if a section is newer than my app?** It is skipped on import but kept in the file, so it is not lost if you export again.

**What if the file was altered?** If the integrity check does not match, you will see a warning in the summary before importing.
