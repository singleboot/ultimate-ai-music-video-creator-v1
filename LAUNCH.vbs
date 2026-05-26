' Ultimate Music Video Creator v1 - Silent Launcher
' Runs LAUNCH.bat without showing a console window

Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "LAUNCH.bat", 0, False
Set shell = Nothing
