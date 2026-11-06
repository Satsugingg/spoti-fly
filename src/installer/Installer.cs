using System;
using System.IO;
using System.IO.Compression;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace SpotiflyInstaller
{
    public class Program
    {
        [DllImport("shell32.dll", SetLastError = true)]
        private static extern int SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        [STAThread]
        public static void Main()
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID("Spotifly.Installer");
            }
            catch { }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        // Win32 API imports for dragging & rounded corners
        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();
        [DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        [DllImport("Gdi32.dll", EntryPoint = "CreateRoundRectRgn")]
        private static extern IntPtr CreateRoundRectRgn(
            int nLeftRect, int nTopRect, int nRightRect, int nBottomRect,
            int nWidthEllipse, int nHeightEllipse
        );

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        // Spotify Color Palette
        public static readonly Color BgDark = Color.FromArgb(18, 18, 18);
        public static readonly Color CardBg = Color.FromArgb(24, 24, 24);
        public static readonly Color CardBorder = Color.FromArgb(42, 42, 42);
        public static readonly Color SpotifyGreen = Color.FromArgb(29, 185, 84);
        public static readonly Color SpotifyGreenHover = Color.FromArgb(30, 215, 96);
        public static readonly Color SpotifyGreenPressed = Color.FromArgb(22, 142, 64);
        public static readonly Color TextPrimary = Color.FromArgb(255, 255, 255);
        public static readonly Color TextSecondary = Color.FromArgb(179, 179, 179);
        public static readonly Color TextMuted = Color.FromArgb(120, 120, 120);
        public static readonly Color InputBg = Color.FromArgb(34, 34, 34);

        // UI Panels
        private Panel headerPanel;
        private Panel contentPanel;
        private Panel welcomePanel;
        private Panel installPanel;
        private Panel finishPanel;

        // Controls
        private TextBox txtInstallPath;
        private SpotifyCheckBox chkDesktopShortcut;
        private SpotifyCheckBox chkLaunchApp;
        private SpotifyProgressBar progressBar;
        private Label lblStatus;
        private Label lblPercent;
        private Label lblCurrentFile;
        private Label lblInstalling;
        private Label lblSuccess;
        private Label lblSuccessDesc;

        // State
        private string targetDirectory;
        private string detectedExistingPath = null;
        private bool isUpdateMode = false;
        private Image logoImage = null;

        public InstallerForm()
        {
            InitializeComponent();
            DetectExistingInstallation();
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ClassStyle |= 0x00020000; // CS_DROPSHADOW
                cp.Style |= 0x00020000;      // WS_MINIMIZEBOX (enables taskbar thumbnail & minimize/restore)
                return cp;
            }
        }

        private void InitializeComponent()
        {
            this.Size = new Size(580, 440);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = BgDark;
            this.ForeColor = TextPrimary;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            this.Text = "Spoti-Fly Setup v" + AppInfo.Version;
            this.ShowIcon = true;
            this.ShowInTaskbar = true;

            // Load embedded icon and logo
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream iconStream = asm.GetManifestResourceStream("icon.ico"))
                {
                    if (iconStream != null)
                    {
                        this.Icon = new Icon(iconStream);
                    }
                }
            }
            catch { }

            if (this.Icon == null)
            {
                try
                {
                    this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
                catch { }
            }

            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("logo.png"))
                {
                    if (stream != null)
                    {
                        logoImage = Image.FromStream(stream);
                    }
                }
            }
            catch { }

            // Rounded window corners
            try
            {
                this.Region = Region.FromHrgn(CreateRoundRectRgn(0, 0, Width, Height, 16, 16));
            }
            catch { }

            BuildHeader();

            contentPanel = new Panel();
            contentPanel.Dock = DockStyle.Fill;
            contentPanel.BackColor = BgDark;
            this.Controls.Add(contentPanel);

            BuildWelcomePanel();
            BuildInstallProgressPanel();
            BuildFinishPanel();

            ShowPanel(welcomePanel);
        }

        private void BuildHeader()
        {
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 44;
            headerPanel.BackColor = Color.FromArgb(14, 14, 14);

            headerPanel.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left)
                {
                    ReleaseCapture();
                    SendMessage(Handle, 0xA1, 0x2, 0);
                }
            };

            // App Icon & Title
            PictureBox picIcon = new PictureBox();
            picIcon.Size = new Size(24, 24);
            picIcon.Location = new Point(14, 10);
            picIcon.SizeMode = PictureBoxSizeMode.Zoom;
            if (logoImage != null) picIcon.Image = logoImage;
            picIcon.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left) { ReleaseCapture(); SendMessage(Handle, 0xA1, 0x2, 0); }
            };
            headerPanel.Controls.Add(picIcon);

            Label lblTitle = new Label();
            lblTitle.Text = "Spoti-Fly Setup v" + AppInfo.Version;
            lblTitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblTitle.ForeColor = TextSecondary;
            lblTitle.AutoSize = true;
            lblTitle.Location = new Point(44, 12);
            lblTitle.MouseDown += (s, e) =>
            {
                if (e.Button == MouseButtons.Left) { ReleaseCapture(); SendMessage(Handle, 0xA1, 0x2, 0); }
            };
            headerPanel.Controls.Add(lblTitle);

            // Minimize button
            Button btnMin = new Button();
            btnMin.Text = "–";
            btnMin.Size = new Size(40, 44);
            btnMin.Location = new Point(Width - 80, 0);
            btnMin.FlatStyle = FlatStyle.Flat;
            btnMin.FlatAppearance.BorderSize = 0;
            btnMin.ForeColor = TextSecondary;
            btnMin.Font = new Font("Segoe UI", 11f);
            btnMin.Cursor = Cursors.Hand;
            btnMin.Click += (s, e) => this.WindowState = FormWindowState.Minimized;
            btnMin.MouseEnter += (s, e) => btnMin.BackColor = Color.FromArgb(30, 30, 30);
            btnMin.MouseLeave += (s, e) => btnMin.BackColor = Color.Transparent;
            headerPanel.Controls.Add(btnMin);

            // Close button
            Button btnClose = new Button();
            btnClose.Text = "✕";
            btnClose.Size = new Size(40, 44);
            btnClose.Location = new Point(Width - 40, 0);
            btnClose.FlatStyle = FlatStyle.Flat;
            btnClose.FlatAppearance.BorderSize = 0;
            btnClose.ForeColor = TextSecondary;
            btnClose.Font = new Font("Segoe UI", 9.5f);
            btnClose.Cursor = Cursors.Hand;
            btnClose.Click += (s, e) => this.Close();
            btnClose.MouseEnter += (s, e) => { btnClose.BackColor = Color.FromArgb(220, 40, 40); btnClose.ForeColor = Color.White; };
            btnClose.MouseLeave += (s, e) => { btnClose.BackColor = Color.Transparent; btnClose.ForeColor = TextSecondary; };
            headerPanel.Controls.Add(btnClose);

            this.Controls.Add(headerPanel);
        }

        private void DetectExistingInstallation()
        {
            try
            {
                // 1. Check remembered location in AppData\spoti-fly\installed-location.txt
                string appDataConfig = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "spoti-fly", "installed-location.txt");
                if (File.Exists(appDataConfig))
                {
                    string remembered = File.ReadAllText(appDataConfig).Trim();
                    if (!string.IsNullOrEmpty(remembered) && Directory.Exists(remembered))
                    {
                        detectedExistingPath = remembered;
                        isUpdateMode = true;
                        targetDirectory = remembered;
                        txtInstallPath.Text = remembered;
                        UpdateWelcomePanelForExisting();
                        return;
                    }
                }

                // 2. Check default standard path
                string defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Spotifly");
                if (Directory.Exists(defaultPath) && File.Exists(Path.Combine(defaultPath, "Spoti-Fly.exe")))
                {
                    detectedExistingPath = defaultPath;
                    isUpdateMode = true;
                    targetDirectory = defaultPath;
                    txtInstallPath.Text = defaultPath;
                    UpdateWelcomePanelForExisting();
                    return;
                }

                // 3. Fresh installation default
                targetDirectory = defaultPath;
                txtInstallPath.Text = defaultPath;
            }
            catch
            {
                string defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Spotifly");
                targetDirectory = defaultPath;
                txtInstallPath.Text = defaultPath;
            }
        }

        private void BuildWelcomePanel()
        {
            welcomePanel = new Panel();
            welcomePanel.Dock = DockStyle.Fill;
            welcomePanel.BackColor = BgDark;

            // Brand Header Area
            PictureBox picBigLogo = new PictureBox();
            picBigLogo.Size = new Size(54, 54);
            picBigLogo.Location = new Point(28, 20);
            picBigLogo.SizeMode = PictureBoxSizeMode.Zoom;
            if (logoImage != null) picBigLogo.Image = logoImage;
            welcomePanel.Controls.Add(picBigLogo);

            Label lblAppName = new Label();
            lblAppName.Text = "Spoti-Fly";
            lblAppName.Font = new Font("Segoe UI", 19f, FontStyle.Bold);
            lblAppName.ForeColor = TextPrimary;
            lblAppName.AutoSize = true;
            lblAppName.Location = new Point(90, 16);
            welcomePanel.Controls.Add(lblAppName);

            Label lblTagline = new Label();
            lblTagline.Text = "Always-on-Top Spotify Mini-Player • v" + AppInfo.Version;
            lblTagline.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblTagline.ForeColor = TextSecondary;
            lblTagline.AutoSize = true;
            lblTagline.Location = new Point(93, 50);
            welcomePanel.Controls.Add(lblTagline);

            // Card Panel for Settings / Location
            Panel cardPanel = new Panel();
            cardPanel.Size = new Size(524, 215);
            cardPanel.Location = new Point(28, 86);
            cardPanel.BackColor = CardBg;
            cardPanel.Paint += (s, e) =>
            {
                using (Pen p = new Pen(CardBorder, 1))
                {
                    e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                    Rectangle r = new Rectangle(0, 0, cardPanel.Width - 1, cardPanel.Height - 1);
                    using (GraphicsPath path = GetRoundedRect(r, 10))
                    {
                        e.Graphics.DrawPath(p, path);
                    }
                }
            };
            welcomePanel.Controls.Add(cardPanel);

            // Path Title
            Label lblPathTitle = new Label();
            lblPathTitle.Name = "lblPathTitle";
            lblPathTitle.Text = "Installation Folder";
            lblPathTitle.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblPathTitle.ForeColor = TextPrimary;
            lblPathTitle.AutoSize = true;
            lblPathTitle.Location = new Point(18, 16);
            cardPanel.Controls.Add(lblPathTitle);

            // Subtitle info
            Label lblPathDesc = new Label();
            lblPathDesc.Name = "lblPathDesc";
            lblPathDesc.Text = "Choose where you would like Spoti-Fly to be installed:";
            lblPathDesc.Font = new Font("Segoe UI", 9f);
            lblPathDesc.ForeColor = TextMuted;
            lblPathDesc.AutoSize = true;
            lblPathDesc.Location = new Point(18, 38);
            cardPanel.Controls.Add(lblPathDesc);

            // Input Path Box
            Panel txtContainer = new Panel();
            txtContainer.Name = "txtContainer";
            txtContainer.Size = new Size(380, 36);
            txtContainer.Location = new Point(18, 62);
            txtContainer.BackColor = InputBg;
            txtContainer.Paint += (s, e) =>
            {
                using (Pen p = new Pen(CardBorder, 1))
                {
                    e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                    Rectangle r = new Rectangle(0, 0, txtContainer.Width - 1, txtContainer.Height - 1);
                    using (GraphicsPath path = GetRoundedRect(r, 6))
                    {
                        e.Graphics.DrawPath(p, path);
                    }
                }
            };

            txtInstallPath = new TextBox();
            txtInstallPath.Size = new Size(360, 20);
            txtInstallPath.Location = new Point(10, 8);
            txtInstallPath.BackColor = InputBg;
            txtInstallPath.ForeColor = TextPrimary;
            txtInstallPath.BorderStyle = BorderStyle.None;
            txtInstallPath.Font = new Font("Segoe UI", 9.5f);
            txtContainer.Controls.Add(txtInstallPath);
            cardPanel.Controls.Add(txtContainer);

            // Browse Button
            SpotifyButton btnBrowse = new SpotifyButton("Browse...", false);
            btnBrowse.Name = "btnBrowse";
            btnBrowse.Size = new Size(95, 36);
            btnBrowse.Location = new Point(410, 62);
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Select Installation Directory for Spoti-Fly";
                    fbd.SelectedPath = txtInstallPath.Text;
                    fbd.ShowNewFolderButton = true;
                    if (fbd.ShowDialog(this) == DialogResult.OK)
                    {
                        txtInstallPath.Text = fbd.SelectedPath;
                        targetDirectory = fbd.SelectedPath;
                    }
                }
            };
            cardPanel.Controls.Add(btnBrowse);

            // Checkboxes
            chkDesktopShortcut = new SpotifyCheckBox("Create Desktop Shortcut");
            chkDesktopShortcut.Checked = true;
            chkDesktopShortcut.Location = new Point(20, 115);
            chkDesktopShortcut.Size = new Size(250, 24);
            cardPanel.Controls.Add(chkDesktopShortcut);

            chkLaunchApp = new SpotifyCheckBox("Launch Spoti-Fly after installation");
            chkLaunchApp.Checked = true;
            chkLaunchApp.Location = new Point(20, 148);
            chkLaunchApp.Size = new Size(250, 24);
            cardPanel.Controls.Add(chkLaunchApp);

            Label lblCloseNotice = new Label();
            lblCloseNotice.Text = "ℹ Running Spoti-Fly instances will be closed automatically.";
            lblCloseNotice.Font = new Font("Segoe UI", 8.2f);
            lblCloseNotice.ForeColor = TextMuted;
            lblCloseNotice.AutoSize = true;
            lblCloseNotice.Location = new Point(22, 180);
            cardPanel.Controls.Add(lblCloseNotice);

            // Bottom Action Area
            SpotifyButton btnInstall = new SpotifyButton("Install Spoti-Fly", true);
            btnInstall.Name = "btnInstall";
            btnInstall.Size = new Size(180, 42);
            btnInstall.Location = new Point(Width - 28 - 180, 320);
            btnInstall.Click += (s, e) => StartInstallation();
            welcomePanel.Controls.Add(btnInstall);

            SpotifyButton btnCancel = new SpotifyButton("Cancel", false);
            btnCancel.Size = new Size(90, 42);
            btnCancel.Location = new Point(Width - 28 - 180 - 100, 320);
            btnCancel.Click += (s, e) => this.Close();
            welcomePanel.Controls.Add(btnCancel);

            contentPanel.Controls.Add(welcomePanel);
        }

        private void UpdateWelcomePanelForExisting()
        {
            if (welcomePanel == null) return;

            Control[] btnInstalls = welcomePanel.Controls.Find("btnInstall", true);
            if (btnInstalls.Length > 0 && btnInstalls[0] is SpotifyButton)
            {
                ((SpotifyButton)btnInstalls[0]).ButtonText = "Update Spoti-Fly (v" + AppInfo.Version + ")";
            }

            Control[] lblDescs = welcomePanel.Controls.Find("lblPathDesc", true);
            if (lblDescs.Length > 0 && lblDescs[0] is Label)
            {
                string info = !string.IsNullOrEmpty(detectedExistingPath) 
                    ? "Existing installation detected at remembered path. Click Update to upgrade:"
                    : "Existing installation detected! Updating Spoti-Fly at:";
                lblDescs[0].Text = info;
                lblDescs[0].ForeColor = SpotifyGreen;
            }

            Control[] lblPathTitles = welcomePanel.Controls.Find("lblPathTitle", true);
            if (lblPathTitles.Length > 0 && lblPathTitles[0] is Label)
            {
                lblPathTitles[0].Text = isUpdateMode ? "Update Location" : "Installation Folder";
            }
        }

        private void BuildInstallProgressPanel()
        {
            installPanel = new Panel();
            installPanel.Dock = DockStyle.Fill;
            installPanel.BackColor = BgDark;

            lblInstalling = new Label();
            lblInstalling.Text = "Installing Spoti-Fly v" + AppInfo.Version;
            lblInstalling.Font = new Font("Segoe UI", 16f, FontStyle.Bold);
            lblInstalling.ForeColor = TextPrimary;
            lblInstalling.AutoSize = true;
            lblInstalling.Location = new Point(28, 40);
            installPanel.Controls.Add(lblInstalling);

            lblStatus = new Label();
            lblStatus.Text = "Preparing extraction...";
            lblStatus.Font = new Font("Segoe UI", 9.5f);
            lblStatus.ForeColor = TextSecondary;
            lblStatus.AutoSize = true;
            lblStatus.Location = new Point(28, 80);
            installPanel.Controls.Add(lblStatus);

            lblPercent = new Label();
            lblPercent.Text = "0%";
            lblPercent.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            lblPercent.ForeColor = SpotifyGreen;
            lblPercent.AutoSize = true;
            lblPercent.Location = new Point(520, 80);
            installPanel.Controls.Add(lblPercent);

            progressBar = new SpotifyProgressBar();
            progressBar.Size = new Size(524, 14);
            progressBar.Location = new Point(28, 110);
            installPanel.Controls.Add(progressBar);

            lblCurrentFile = new Label();
            lblCurrentFile.Text = "";
            lblCurrentFile.Font = new Font("Segoe UI", 8.5f);
            lblCurrentFile.ForeColor = TextMuted;
            lblCurrentFile.Size = new Size(524, 20);
            lblCurrentFile.Location = new Point(28, 134);
            installPanel.Controls.Add(lblCurrentFile);

            contentPanel.Controls.Add(installPanel);
        }

        private void BuildFinishPanel()
        {
            finishPanel = new Panel();
            finishPanel.Dock = DockStyle.Fill;
            finishPanel.BackColor = BgDark;

            // Big Green Check Icon
            CheckmarkIcon check = new CheckmarkIcon();
            check.Size = new Size(64, 64);
            check.Location = new Point(28, 40);
            finishPanel.Controls.Add(check);

            lblSuccess = new Label();
            lblSuccess.Text = "Ready to Fly!";
            lblSuccess.Font = new Font("Segoe UI", 20f, FontStyle.Bold);
            lblSuccess.ForeColor = TextPrimary;
            lblSuccess.AutoSize = true;
            lblSuccess.Location = new Point(106, 42);
            finishPanel.Controls.Add(lblSuccess);

            lblSuccessDesc = new Label();
            lblSuccessDesc.Text = "Spoti-Fly v" + AppInfo.Version + " has been successfully installed and configured.";
            lblSuccessDesc.Font = new Font("Segoe UI", 10f);
            lblSuccessDesc.ForeColor = TextSecondary;
            lblSuccessDesc.AutoSize = true;
            lblSuccessDesc.Location = new Point(108, 82);
            finishPanel.Controls.Add(lblSuccessDesc);

            // Summary Card
            Panel sumCard = new Panel();
            sumCard.Size = new Size(524, 90);
            sumCard.Location = new Point(28, 135);
            sumCard.BackColor = CardBg;
            sumCard.Paint += (s, e) =>
            {
                using (Pen p = new Pen(CardBorder, 1))
                {
                    e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                    Rectangle r = new Rectangle(0, 0, sumCard.Width - 1, sumCard.Height - 1);
                    using (GraphicsPath path = GetRoundedRect(r, 10))
                    {
                        e.Graphics.DrawPath(p, path);
                    }
                }
            };
            finishPanel.Controls.Add(sumCard);

            Label lblSumTitle = new Label();
            lblSumTitle.Text = "Installed Location:";
            lblSumTitle.Font = new Font("Segoe UI", 9f, FontStyle.Bold);
            lblSumTitle.ForeColor = TextMuted;
            lblSumTitle.AutoSize = true;
            lblSumTitle.Location = new Point(16, 16);
            sumCard.Controls.Add(lblSumTitle);

            Label lblSumPath = new Label();
            lblSumPath.Name = "lblSumPath";
            lblSumPath.Text = "";
            lblSumPath.Font = new Font("Segoe UI", 9.5f);
            lblSumPath.ForeColor = TextPrimary;
            lblSumPath.Size = new Size(490, 40);
            lblSumPath.Location = new Point(16, 38);
            sumCard.Controls.Add(lblSumPath);

            // Finish Buttons
            SpotifyButton btnFinish = new SpotifyButton("Launch Spoti-Fly", true);
            btnFinish.Name = "btnFinish";
            btnFinish.Size = new Size(180, 42);
            btnFinish.Location = new Point(Width - 28 - 180, 320);
            btnFinish.Click += (s, e) =>
            {
                if (chkLaunchApp.Checked)
                {
                    try
                    {
                        string exePath = Path.Combine(targetDirectory, "Spoti-Fly.exe");
                        if (File.Exists(exePath))
                        {
                            Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = targetDirectory });
                        }
                    }
                    catch { }
                }
                this.Close();
            };
            finishPanel.Controls.Add(btnFinish);

            contentPanel.Controls.Add(finishPanel);
        }

        private void ShowPanel(Panel p)
        {
            welcomePanel.Visible = (p == welcomePanel);
            installPanel.Visible = (p == installPanel);
            finishPanel.Visible = (p == finishPanel);
        }

        private void StartInstallation()
        {
            targetDirectory = txtInstallPath.Text.Trim();
            if (string.IsNullOrEmpty(targetDirectory))
            {
                MessageBox.Show("Please choose a valid destination directory.", "Spoti-Fly Setup", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (lblInstalling != null)
            {
                lblInstalling.Text = isUpdateMode ? "Updating Spoti-Fly to v" + AppInfo.Version : "Installing Spoti-Fly v" + AppInfo.Version;
            }
            if (lblSuccess != null)
            {
                lblSuccess.Text = isUpdateMode ? "Update Complete!" : "Ready to Fly!";
            }
            if (lblSuccessDesc != null)
            {
                lblSuccessDesc.Text = isUpdateMode ? "Spoti-Fly has been successfully updated to v" + AppInfo.Version + "." : "Spoti-Fly v" + AppInfo.Version + " has been successfully installed and configured.";
            }

            ShowPanel(installPanel);

            System.ComponentModel.BackgroundWorker worker = new System.ComponentModel.BackgroundWorker();
            worker.WorkerReportsProgress = true;

            worker.DoWork += (s, e) =>
            {
                // 1. Thoroughly terminate running Spoti-Fly instances and child processes
                worker.ReportProgress(0, "Closing running Spoti-Fly instances...");
                CloseRunningSpotiFlyInstances(targetDirectory);

                // 2. Ensure target folder exists
                if (!Directory.Exists(targetDirectory))
                {
                    Directory.CreateDirectory(targetDirectory);
                }

                // 3. Extract embedded payload.zip
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("payload.zip"))
                {
                    if (stream == null)
                    {
                        throw new InvalidOperationException("Installer payload resource was not found.");
                    }

                    using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                    {
                        int total = archive.Entries.Count;
                        int count = 0;

                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            count++;
                            int percent = (int)(((double)count / total) * 90);
                            worker.ReportProgress(percent, entry.FullName);

                            string destPath = Path.Combine(targetDirectory, entry.FullName);

                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                // Directory entry
                                Directory.CreateDirectory(destPath);
                            }
                            else
                            {
                                string parent = Path.GetDirectoryName(destPath);
                                if (!Directory.Exists(parent)) Directory.CreateDirectory(parent);

                                // Extract with retry and process kill on lock
                                ExtractEntryWithRetry(entry, destPath);
                            }
                        }
                    }
                }

                worker.ReportProgress(92, "Remembering install location...");
                // 4. Remember install location without touching Windows Registry!
                try
                {
                    string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "spoti-fly");
                    if (!Directory.Exists(appDataDir)) Directory.CreateDirectory(appDataDir);
                    File.WriteAllText(Path.Combine(appDataDir, "installed-location.txt"), targetDirectory);
                }
                catch { }

                worker.ReportProgress(96, "Configuring shortcuts...");
                string exePath = Path.Combine(targetDirectory, "Spoti-Fly.exe");

                // 5. Create Desktop shortcut if requested
                if (chkDesktopShortcut.Checked && File.Exists(exePath))
                {
                    try
                    {
                        string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        CreateShortcut(Path.Combine(desktopPath, "Spoti-Fly.lnk"), exePath, targetDirectory);
                    }
                    catch { }
                }

                // 6. Create Start Menu shortcut
                try
                {
                    string startMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"Microsoft\Windows\Start Menu\Programs");
                    if (Directory.Exists(startMenu) && File.Exists(exePath))
                    {
                        CreateShortcut(Path.Combine(startMenu, "Spoti-Fly.lnk"), exePath, targetDirectory);
                    }
                }
                catch { }

                worker.ReportProgress(100, "Done");
            };

            worker.ProgressChanged += (s, e) =>
            {
                progressBar.Value = Math.Min(100, Math.Max(0, e.ProgressPercentage));
                lblPercent.Text = e.ProgressPercentage + "%";
                string current = e.UserState as string;
                if (!string.IsNullOrEmpty(current))
                {
                    if (current.Length > 55) current = "..." + current.Substring(current.Length - 52);
                    lblCurrentFile.Text = current;
                }
            };

            worker.RunWorkerCompleted += (s, e) =>
            {
                if (e.Error != null)
                {
                    MessageBox.Show("An error occurred during installation:\n" + e.Error.Message, "Installation Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    ShowPanel(welcomePanel);
                }
                else
                {
                    Control[] sumPaths = finishPanel.Controls.Find("lblSumPath", true);
                    if (sumPaths.Length > 0) sumPaths[0].Text = targetDirectory;

                    Control[] btnFinishes = finishPanel.Controls.Find("btnFinish", true);
                    if (btnFinishes.Length > 0 && btnFinishes[0] is SpotifyButton)
                    {
                        ((SpotifyButton)btnFinishes[0]).ButtonText = chkLaunchApp.Checked ? "Launch Spoti-Fly" : "Finish";
                    }

                    ShowPanel(finishPanel);
                }
            };

            worker.RunWorkerAsync();
        }

        private static void CreateShortcut(string shortcutPath, string targetExe, string workDir)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetExe;
                shortcut.WorkingDirectory = workDir;
                shortcut.IconLocation = targetExe + ",0";
                shortcut.Description = "Spoti-Fly - Always-on-Top Spotify Mini-Player";
                shortcut.Save();
            }
            catch { }
        }

        private static void CloseRunningSpotiFlyInstances(string targetDir)
        {
            // A. Kill via taskkill /F /T by image name (terminates entire process trees including GPU/renderer/audio helpers)
            string[] imageNames = new string[] { "Spoti-Fly.exe", "spoti-fly.exe", "spotifly_vol.exe", "media_keys.exe" };
            foreach (string img in imageNames)
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /IM \"" + img + "\" /T")
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    using (Process p = Process.Start(psi))
                    {
                        if (p != null) p.WaitForExit(2000);
                    }
                }
                catch { }
            }

            // B. Check running .NET Process objects for any lingering process named spoti-fly or running from targetDir
            try
            {
                Process[] allProcs = Process.GetProcesses();
                foreach (Process p in allProcs)
                {
                    try
                    {
                        string pName = p.ProcessName.ToLowerInvariant();
                        bool match = pName.Contains("spoti-fly") || pName.Contains("spotifly");

                        if (!match && !string.IsNullOrEmpty(targetDir) && Directory.Exists(targetDir))
                        {
                            try
                            {
                                string moduleFile = p.MainModule != null ? p.MainModule.FileName : null;
                                if (!string.IsNullOrEmpty(moduleFile) && moduleFile.StartsWith(targetDir, StringComparison.OrdinalIgnoreCase))
                                {
                                    match = true;
                                }
                            }
                            catch { }
                        }

                        if (match)
                        {
                            p.Kill();
                            p.WaitForExit(1000);
                        }
                    }
                    catch { }
                }
            }
            catch { }

            // C. Wait and poll file locks on target executables (e.g. Spoti-Fly.exe)
            string[] checkFiles = new string[] { "Spoti-Fly.exe", @"resources\app.asar.unpacked\dist\main\spotifly_vol.exe", @"resources\app.asar.unpacked\dist\main\media_keys.exe" };
            foreach (string rel in checkFiles)
            {
                string fullPath = Path.Combine(targetDir, rel);
                if (File.Exists(fullPath))
                {
                    int maxWait = 6000;
                    int elapsed = 0;
                    while (elapsed < maxWait)
                    {
                        if (!IsFileLocked(fullPath)) break;
                        System.Threading.Thread.Sleep(250);
                        elapsed += 250;
                    }
                }
            }

            // Brief pause for Windows file system buffers
            System.Threading.Thread.Sleep(300);
        }

        private static bool IsFileLocked(string filePath)
        {
            if (!File.Exists(filePath)) return false;
            FileStream stream = null;
            try
            {
                stream = File.Open(filePath, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
                return false;
            }
            catch (IOException)
            {
                return true;
            }
            catch (UnauthorizedAccessException)
            {
                return true;
            }
            finally
            {
                if (stream != null) stream.Dispose();
            }
        }

        private static void ExtractEntryWithRetry(ZipArchiveEntry entry, string destPath)
        {
            int maxRetries = 10;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    entry.ExtractToFile(destPath, true);
                    return;
                }
                catch (Exception ex)
                {
                    if (attempt == maxRetries)
                    {
                        throw new IOException("Failed to write to '" + destPath + "' after " + maxRetries + " attempts: " + ex.Message, ex);
                    }

                    // If file is locked, trigger another taskkill for the executable in case a process was restarted or lingered
                    if (destPath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            string fileName = Path.GetFileName(destPath);
                            ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /IM \"" + fileName + "\" /T")
                            {
                                CreateNoWindow = true,
                                UseShellExecute = false
                            };
                            using (Process p = Process.Start(psi))
                            {
                                if (p != null) p.WaitForExit(1000);
                            }
                        }
                        catch { }
                    }

                    System.Threading.Thread.Sleep(350);
                }
            }
        }

        public static GraphicsPath GetRoundedRect(Rectangle bounds, int radius)
        {
            int diameter = radius * 2;
            Size size = new Size(diameter, diameter);
            Rectangle arc = new Rectangle(bounds.Location, size);
            GraphicsPath path = new GraphicsPath();

            if (radius == 0)
            {
                path.AddRectangle(bounds);
                return path;
            }

            // Top-left
            path.AddArc(arc, 180, 90);

            // Top-right
            arc.X = bounds.Right - diameter;
            path.AddArc(arc, 270, 90);

            // Bottom-right
            arc.Y = bounds.Bottom - diameter;
            path.AddArc(arc, 0, 90);

            // Bottom-left
            arc.X = bounds.Left;
            path.AddArc(arc, 90, 90);

            path.CloseFigure();
            return path;
        }
    }

    // Custom Spotify Button Control
    public class SpotifyButton : Control
    {
        private bool isHovered = false;
        private bool isPressed = false;
        private bool isPrimary = true;
        private string buttonText = "";

        public string ButtonText
        {
            get { return buttonText; }
            set { buttonText = value; Invalidate(); }
        }

        public SpotifyButton(string text, bool primary)
        {
            this.buttonText = text;
            this.isPrimary = primary;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.Cursor = Cursors.Hand;
        }

        protected override void OnMouseEnter(EventArgs e) { isHovered = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { isHovered = false; isPressed = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnMouseDown(MouseEventArgs e) { isPressed = true; Invalidate(); base.OnMouseDown(e); }
        protected override void OnMouseUp(MouseEventArgs e) { isPressed = false; Invalidate(); base.OnMouseUp(e); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Color bg;
            Color textCol;

            if (isPrimary)
            {
                if (isPressed) bg = InstallerForm.SpotifyGreenPressed;
                else if (isHovered) bg = InstallerForm.SpotifyGreenHover;
                else bg = InstallerForm.SpotifyGreen;

                textCol = Color.FromArgb(10, 10, 10); // Crisp dark text on vibrant green
            }
            else
            {
                if (isPressed) bg = Color.FromArgb(48, 48, 48);
                else if (isHovered) bg = Color.FromArgb(38, 38, 38);
                else bg = Color.FromArgb(28, 28, 28);

                textCol = InstallerForm.TextPrimary;
            }

            Rectangle r = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = InstallerForm.GetRoundedRect(r, Height / 2))
            {
                using (SolidBrush b = new SolidBrush(bg))
                {
                    g.FillPath(b, path);
                }

                if (!isPrimary)
                {
                    using (Pen p = new Pen(InstallerForm.CardBorder, 1))
                    {
                        g.DrawPath(p, path);
                    }
                }
            }

            using (Font f = new Font("Segoe UI", 9.5f, FontStyle.Bold))
            using (SolidBrush tb = new SolidBrush(textCol))
            {
                StringFormat sf = new StringFormat
                {
                    Alignment = StringAlignment.Center,
                    LineAlignment = StringAlignment.Center
                };
                g.DrawString(buttonText, f, tb, new RectangleF(0, 0, Width, Height), sf);
            }
        }
    }

    // Custom Spotify Checkbox Control
    public class SpotifyCheckBox : Control
    {
        private bool isChecked = false;
        private bool isHovered = false;

        public bool Checked
        {
            get { return isChecked; }
            set { isChecked = value; Invalidate(); }
        }

        public SpotifyCheckBox(string text)
        {
            this.Text = text;
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            this.Cursor = Cursors.Hand;
        }

        protected override void OnMouseEnter(EventArgs e) { isHovered = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { isHovered = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnClick(EventArgs e) { isChecked = !isChecked; Invalidate(); base.OnClick(e); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Box
            int boxSize = 18;
            Rectangle boxRect = new Rectangle(2, (Height - boxSize) / 2, boxSize, boxSize);

            using (GraphicsPath path = InstallerForm.GetRoundedRect(boxRect, 4))
            {
                if (isChecked)
                {
                    using (SolidBrush b = new SolidBrush(InstallerForm.SpotifyGreen))
                    {
                        g.FillPath(b, path);
                    }

                    // Draw Checkmark
                    using (Pen p = new Pen(Color.FromArgb(10, 10, 10), 2.2f))
                    {
                        p.StartCap = LineCap.Round;
                        p.EndCap = LineCap.Round;
                        PointF p1 = new PointF(boxRect.Left + 4.5f, boxRect.Top + 9.5f);
                        PointF p2 = new PointF(boxRect.Left + 7.5f, boxRect.Top + 13f);
                        PointF p3 = new PointF(boxRect.Left + 13.5f, boxRect.Top + 5.5f);
                        g.DrawLines(p, new PointF[] { p1, p2, p3 });
                    }
                }
                else
                {
                    using (SolidBrush b = new SolidBrush(Color.FromArgb(32, 32, 32)))
                    {
                        g.FillPath(b, path);
                    }
                    using (Pen p = new Pen(isHovered ? InstallerForm.SpotifyGreen : InstallerForm.CardBorder, 1.2f))
                    {
                        g.DrawPath(p, path);
                    }
                }
            }

            // Label text
            using (Font f = new Font("Segoe UI", 9.2f, FontStyle.Regular))
            using (SolidBrush tb = new SolidBrush(InstallerForm.TextPrimary))
            {
                StringFormat sf = new StringFormat
                {
                    LineAlignment = StringAlignment.Center
                };
                g.DrawString(this.Text, f, tb, new RectangleF(boxSize + 10, 0, Width - boxSize - 10, Height), sf);
            }
        }
    }

    // Custom Spotify Progress Bar Control
    public class SpotifyProgressBar : Control
    {
        private int val = 0;

        public int Value
        {
            get { return val; }
            set { val = Math.Max(0, Math.Min(100, value)); Invalidate(); }
        }

        public SpotifyProgressBar()
        {
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Track background
            Rectangle trackRect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath trackPath = InstallerForm.GetRoundedRect(trackRect, Height / 2))
            {
                using (SolidBrush b = new SolidBrush(Color.FromArgb(36, 36, 36)))
                {
                    g.FillPath(b, trackPath);
                }
            }

            // Progress Fill
            if (val > 0)
            {
                int fillWidth = (int)((val / 100.0) * Width);
                if (fillWidth > 0)
                {
                    Rectangle fillRect = new Rectangle(0, 0, fillWidth, Height - 1);
                    using (GraphicsPath fillPath = InstallerForm.GetRoundedRect(fillRect, Height / 2))
                    {
                        using (SolidBrush b = new SolidBrush(InstallerForm.SpotifyGreen))
                        {
                            g.FillPath(b, fillPath);
                        }
                    }
                }
            }
        }
    }

    // Large Glowing Success Checkmark Control
    public class CheckmarkIcon : Control
    {
        public CheckmarkIcon()
        {
            this.SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            int size = Math.Min(Width, Height) - 4;
            Rectangle circleRect = new Rectangle(2, 2, size, size);

            // Glow / Outer ring
            using (SolidBrush bg = new SolidBrush(Color.FromArgb(29, 185, 84, 40)))
            {
                g.FillEllipse(bg, circleRect);
            }

            // Inner circle
            Rectangle innerRect = new Rectangle(6, 6, size - 8, size - 8);
            using (SolidBrush bg = new SolidBrush(InstallerForm.SpotifyGreen))
            {
                g.FillEllipse(bg, innerRect);
            }

            // White Checkmark
            using (Pen p = new Pen(Color.White, 3.8f))
            {
                p.StartCap = LineCap.Round;
                p.EndCap = LineCap.Round;

                PointF p1 = new PointF(innerRect.Left + innerRect.Width * 0.28f, innerRect.Top + innerRect.Height * 0.52f);
                PointF p2 = new PointF(innerRect.Left + innerRect.Width * 0.45f, innerRect.Top + innerRect.Height * 0.69f);
                PointF p3 = new PointF(innerRect.Left + innerRect.Width * 0.72f, innerRect.Top + innerRect.Height * 0.35f);

                g.DrawLines(p, new PointF[] { p1, p2, p3 });
            }
        }
    }
}
