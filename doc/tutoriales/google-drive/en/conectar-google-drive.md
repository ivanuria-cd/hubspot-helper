# Connect Google Drive

**Prerequisites:** an open project in the app and a Google account.
**Estimated time:** 2 minutes.

## Steps

1. In the side menu, open **Settings**.
2. Within **Connectors**, click **Google Drive**.
3. Click the **Connect with Google** button. Your system browser will open with Google's authorization screen.
4. Choose the Google account you want to use for this project.
5. Review the requested permissions and accept. The app only asks for:
   — Access to the files it creates itself or that you select (not to all of your Drive).
   — Your email address, to show which account you are connected with.
6. When you're done, return to the app. You'll see the **Connected** status next to your email.

## Expected result

The Google Drive screen shows "Connected as your-email@example.com" and the **Working folder** section appears for the next step.

## FAQ

**Why does the browser open instead of a window inside the app?**
For security and convenience: this way you authenticate in the browser where you already have your Google session, and the app never sees your password.

**Can the app see all my Drive files?**
No. The permission is scoped (`drive.file`): it can only see and modify the files it creates or the ones you explicitly choose.

**Where is the access stored?**
Credentials are stored encrypted in the operating system keychain, never in plain text or in the repository.
