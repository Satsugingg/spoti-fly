using System;
using System.Threading.Tasks;
using Windows.Media;
using Windows.Media.Control;

class Program {
    static void Main(string[] args) {
        if (args.Length == 0) return;
        try {
            Run(args).Wait();
        } catch (Exception ex) {
            Console.Error.WriteLine(ex.Message);
        }
    }

    static async Task Run(string[] args) {
        var mgr = await WindowsRuntimeSystemExtensions.AsTask(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
        var session = mgr.GetCurrentSession();
        if (session == null) {
            var sessions = mgr.GetSessions();
            for (int i = 0; i < sessions.Count; i++) {
                var s = sessions[i];
                if (s.SourceAppId != null && s.SourceAppId.IndexOf("spotify", StringComparison.OrdinalIgnoreCase) >= 0) {
                    session = s;
                    break;
                }
            }
            if (session == null && sessions.Count > 0) {
                session = sessions[0];
            }
        }
        if (session == null) return;

        string cmd = args[0].ToLowerInvariant();
        switch (cmd) {
            case "toggle":
            case "playpause":
                await WindowsRuntimeSystemExtensions.AsTask(session.TryTogglePlayPauseAsync());
                break;
            case "next":
                await WindowsRuntimeSystemExtensions.AsTask(session.TrySkipNextAsync());
                break;
            case "prev":
            case "previous":
                await WindowsRuntimeSystemExtensions.AsTask(session.TrySkipPreviousAsync());
                break;
            case "seek":
                if (args.Length > 1) {
                    double sec;
                    if (double.TryParse(args[1], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out sec)) {
                        long ticks = (long)(sec * 10000000.0);
                        await WindowsRuntimeSystemExtensions.AsTask(session.TryChangePlaybackPositionAsync(ticks));
                    }
                }
                break;
            case "shuffle":
                if (args.Length > 1) {
                    bool shuf;
                    if (bool.TryParse(args[1], out shuf)) {
                        await WindowsRuntimeSystemExtensions.AsTask(session.TryChangeShuffleActiveAsync(shuf));
                    }
                }
                break;
            case "repeat":
                if (args.Length > 1) {
                    string r = args[1].ToLowerInvariant();
                    MediaPlaybackAutoRepeatMode mode = MediaPlaybackAutoRepeatMode.None;
                    if (r == "track") mode = MediaPlaybackAutoRepeatMode.Track;
                    else if (r == "context" || r == "list") mode = MediaPlaybackAutoRepeatMode.List;
                    await WindowsRuntimeSystemExtensions.AsTask(session.TryChangeAutoRepeatModeAsync(mode));
                }
                break;
        }
    }
}
