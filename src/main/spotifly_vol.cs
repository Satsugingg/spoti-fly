using System;
using System.Runtime.InteropServices;

[ComImport]
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
internal class MMDeviceEnumeratorComObject { }

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDeviceEnumerator {
    int NotImpl1();
    [PreserveSig]
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDevice {
    [PreserveSig]
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioEndpointVolume {
    int NotImpl1();
    int NotImpl2();
    int GetChannelCount(out int pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
}

public class SpotiflyVol {
    static IMMDevice GetDefaultEndpoint() {
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        Marshal.ReleaseComObject(enumerator);
        return dev;
    }

    public static float GetMasterVolume() {
        IMMDevice dev = null;
        IAudioEndpointVolume aepv = null;
        try {
            dev = GetDefaultEndpoint();
            Guid iid = typeof(IAudioEndpointVolume).GUID;
            object o;
            dev.Activate(ref iid, 0, IntPtr.Zero, out o);
            aepv = (IAudioEndpointVolume)o;
            float vol = 0;
            aepv.GetMasterVolumeLevelScalar(out vol);
            return vol;
        } finally {
            if (aepv != null) Marshal.ReleaseComObject(aepv);
            if (dev != null) Marshal.ReleaseComObject(dev);
        }
    }

    public static float SetMasterVolume(float vol) {
        if (vol < 0f) vol = 0f;
        if (vol > 1f) vol = 1f;
        IMMDevice dev = null;
        IAudioEndpointVolume aepv = null;
        try {
            dev = GetDefaultEndpoint();
            Guid iid = typeof(IAudioEndpointVolume).GUID;
            object o;
            dev.Activate(ref iid, 0, IntPtr.Zero, out o);
            aepv = (IAudioEndpointVolume)o;
            Guid ctx = Guid.Empty;
            aepv.SetMasterVolumeLevelScalar(vol, ref ctx);
            float actual = 0;
            aepv.GetMasterVolumeLevelScalar(out actual);
            return actual;
        } finally {
            if (aepv != null) Marshal.ReleaseComObject(aepv);
            if (dev != null) Marshal.ReleaseComObject(dev);
        }
    }

    [DllImport("psapi.dll")]
    static extern int EmptyWorkingSet(IntPtr hwProc);

    static void TrimProcess(int pid) {
        try {
            using (var proc = System.Diagnostics.Process.GetProcessById(pid)) {
                EmptyWorkingSet(proc.Handle);
            }
        } catch {}
    }

    static void TrimAllSpotifly() {
        string[] targetNames = new string[] { "Spoti-Fly", "electron" };
        foreach (string name in targetNames) {
            try {
                foreach (var proc in System.Diagnostics.Process.GetProcessesByName(name)) {
                    try {
                        EmptyWorkingSet(proc.Handle);
                    } catch {}
                }
            } catch {}
        }
    }

    public static void Main(string[] args) {
        try {
            if (args.Length == 0 || args[0].ToLowerInvariant() == "get-master") {
                Console.WriteLine(Math.Round(GetMasterVolume() * 100));
                return;
            }

            string cmd = args[0].ToLowerInvariant();
            if (cmd == "set-master" && args.Length > 1) {
                float target = float.Parse(args[1], System.Globalization.CultureInfo.InvariantCulture) / 100f;
                Console.WriteLine(Math.Round(SetMasterVolume(target) * 100));
            } else if (cmd == "change-master" && args.Length > 1) {
                float delta = float.Parse(args[1], System.Globalization.CultureInfo.InvariantCulture) / 100f;
                float current = GetMasterVolume();
                Console.WriteLine(Math.Round(SetMasterVolume(current + delta) * 100));
            } else if (cmd == "trim" && args.Length > 1) {
                int pid = int.Parse(args[1]);
                TrimProcess(pid);
                Console.WriteLine("0");
                return;
            } else if (cmd == "trim-all") {
                TrimAllSpotifly();
                Console.WriteLine("0");
                return;
            }
        } catch (Exception ex) {
            Console.Error.WriteLine(ex.Message);
            Environment.Exit(1);
        }
    }
}
