# Drive Cleaner
## Overview 
This is a Google Workspace add-on that allows you to delete unnecessary files on Google Drive in bulk.

## How to work
### Manual Process
1. Go to GAS Console. (https://script.google.com/)
2. Create GAS Project.
3. Create code.js and appscript.json.
4. Copy this code to (3).
5. Click "Deploy" button and show menus.
6. Click "Test Deployments" in menus. 
7. Click "Install".

### Deploy by using the `clasp` command-line tool
1. Log in with the Google account user that runs GAS.
```shell
clasp login
```
2. Create a new GAS project.
```shell
clasp create --title "<Project Name>" --type standalone
```
3. Update GAS project setting.
Check [Project Setting]-[Show "appsscript.json" manifest file in editor].
4. Create code.js and edit appscript.json.
Copy and paste this code to these files.
5. Push this code.
```shell
clasp push
```
