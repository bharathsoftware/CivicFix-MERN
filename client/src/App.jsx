
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Construction,
  Droplets,
  Filter,
  Leaf,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Waves,
  X,
  Lightbulb,
  LoaderCircle,
  UserRound,
  AlertCircle,
} from "lucide-react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const CATEGORIES = [
  { name: "Roads", detail: "Potholes and damaged streets", icon: Construction },
  { name: "Garbage", detail: "Waste and cleanliness", icon: Trash2 },
  { name: "Streetlights", detail: "Broken or missing lights", icon: Lightbulb },
  { name: "Water", detail: "Leaks and drainage", icon: Droplets },
  { name: "Public Safety", detail: "Unsafe public spaces", icon: ShieldCheck },
  { name: "Other", detail: "Other local problems", icon: Waves },
];

const STATUSES = ["Reported", "In Progress", "Resolved"];

const emptyReport = {
  title: "",
  category: "Roads",
  location: "",
  description: "",
  priority: "Medium",
  photoData: "",
};

function getToken() {
  return localStorage.getItem("civicfix_token");
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }

  return data;
}

function formatDate(value) {
  if (!value) return "Recently reported";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Recently reported"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function getIssueId(issue) {
  return issue?._id || issue?.id;
}


function getReporterId(issue) {
  const reporter = issue?.reporter;

  if (reporter && typeof reporter === "object") {
    return (
      reporter._id ||
      reporter.id ||
      reporter.userId ||
      reporter.user?._id ||
      reporter.user?.id ||
      ""
    );
  }

  return reporter || issue?.reporterId || issue?.userId || "";
}


function getReporterName(issue) {
  if (
    issue?.reporter &&
    typeof issue.reporter === "object" &&
    issue.reporter.name
  ) {
    return issue.reporter.name;
  }

  return issue?.reporterName || "Community member";
}

function getIssueStatus(issue) {
  return issue?.status || "Reported";
}

export default function App() {
  const [issues, setIssues] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("newest");
  const [modal, setModal] = useState("");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [reportForm, setReportForm] = useState(emptyReport);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [nextStatus, setNextStatus] = useState("Reported");
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    fixed: "yes",
    comment: "",
  });
  const [profileForm, setProfileForm] = useState({ name: "" });

  const isAdmin = user?.role === "admin";

  const feedbackIssues = useMemo(
    () => issues.filter((issue) => issue.feedback?.rating != null),
    [issues]
  );

  const averageRating = useMemo(() => {
    if (!feedbackIssues.length) return "0.0";

    return (
      feedbackIssues.reduce(
        (total, issue) => total + Number(issue.feedback.rating),
        0
      ) / feedbackIssues.length
    ).toFixed(1);
  }, [feedbackIssues]);

  const reviewRequests = useMemo(
    () => issues.filter((issue) => issue.reviewRequested).length,
    [issues]
  );

  const myIssues = useMemo(() => {
    if (!user) return [];

    return issues.filter((issue) => {
      const reporterId = getReporterId(issue);
      const userId = user.id || user._id || user.userId;

      return (
        String(reporterId || "") === String(userId || "") ||
        (issue.reporterEmail &&
          user.email &&
          issue.reporterEmail.toLowerCase() === user.email.toLowerCase())
      );
    });
  }, [issues, user]);

  const stats = useMemo(
    () => ({
      total: issues.length,
      reported: issues.filter(
        (issue) => getIssueStatus(issue) === "Reported"
      ).length,
      progress: issues.filter(
        (issue) => getIssueStatus(issue) === "In Progress"
      ).length,
      resolved: issues.filter(
        (issue) => getIssueStatus(issue) === "Resolved"
      ).length,
    }),
    [issues]
  );

  const loadIssues = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (category !== "All") params.set("category", category);
      if (status !== "All") params.set("status", status);

      params.set("sort", sort);

      const data = await api(`/issues?${params.toString()}`);

      setIssues(Array.isArray(data) ? data : data.issues || []);
      setError("");
    } catch (err) {
      setError(
        `${err.message} Make sure the server is running and MongoDB is connected.`
      );
    } finally {
      setLoading(false);
    }
  }, [search, category, status, sort]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getToken()) return;

      try {
        const data = await api("/auth/me");

        if (active) {
          const restoredUser = data.user || data;
          setUser(restoredUser);
          setProfileForm({ name: restoredUser.name || "" });
        }
      } catch {
        localStorage.removeItem("civicfix_token");
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAuthForm({ name: "", email: "", password: "" });
    setError("");
    setModal("auth");
  }

  function logout() {
    localStorage.removeItem("civicfix_token");
    setUser(null);
    setModal("");
    showNotice("You have logged out.");
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const data = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm),
      });

      if (!data.token) {
        throw new Error("The server did not return an authentication token.");
      }

      localStorage.setItem("civicfix_token", data.token);

      const loggedInUser = data.user || {};

      setUser(loggedInUser);
      setProfileForm({ name: loggedInUser.name || "" });
      setModal("");
      showNotice(
        `Welcome${loggedInUser.name ? `, ${loggedInUser.name}` : ""}!`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openReport() {
    if (!user) {
      openAuth("login");
      showNotice("Please log in to report an issue.");
      return;
    }

    setReportForm({
      ...emptyReport,
      category: category !== "All" ? category : "Roads",
    });

    setError("");
    setModal("report");
  }

  function handleReportChange(event) {
    const { name, value } = event.target;

    setReportForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setError("Please choose an image smaller than 1.5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setReportForm((previous) => ({
        ...previous,
        photoData: String(reader.result || ""),
      }));
    };

    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
    setError("");
  }

  async function submitReport(event) {
    event.preventDefault();

    if (!user) {
      setError("Please log in before submitting a report.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api("/issues", {
        method: "POST",
        body: JSON.stringify(reportForm),
      });

      setModal("");
      setSearch("");
      setCategory("All");
      setStatus("All");
      showNotice("Your issue has been reported successfully.");

      await loadIssues();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openIssue(issue) {
    setSelectedIssue(issue);
    setNextStatus(getIssueStatus(issue));
    setResolutionNote(issue.resolutionNote || "");
    setFeedbackForm({
      rating: 5,
      fixed: "yes",
      comment: "",
    });
    setError("");
    setModal("issue");
  }

  async function updateStatus(event) {
    event.preventDefault();

    if (!isAdmin || !selectedIssue) {
      setError("Only an administrator can change issue status.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = await api(`/issues/${getIssueId(selectedIssue)}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          resolutionNote:
            nextStatus === "Resolved" ? resolutionNote.trim() : "",
        }),
      });

      if (data.issue) setSelectedIssue(data.issue);

      setResolutionNote(data.issue?.resolutionNote || "");
      showNotice("Issue status updated successfully.");

      await loadIssues();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(event) {
    event.preventDefault();

    if (!user || !selectedIssue) return;

    setBusy(true);
    setError("");

    try {
      const data = await api(
        `/issues/${getIssueId(selectedIssue)}/feedback`,
        {
          method: "POST",
          body: JSON.stringify(feedbackForm),
        }
      );

      if (data.issue) setSelectedIssue(data.issue);

      setFeedbackForm({
        rating: 5,
        fixed: "yes",
        comment: "",
      });

      showNotice(data.message || "Feedback submitted successfully.");
      await loadIssues();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestReview(issue) {
    setBusy(true);
    setError("");

    try {
      const data = await api(`/issues/${getIssueId(issue)}/review`, {
        method: "POST",
      });

      if (data.issue) setSelectedIssue(data.issue);

      showNotice(data.message || "Review requested.");
      await loadIssues();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteIssue(issue) {
    if (!isAdmin) {
      setError("Only an administrator can delete issue reports.");
      return;
    }

    if (!window.confirm("Delete this issue report? This cannot be undone.")) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api(`/issues/${getIssueId(issue)}`, {
        method: "DELETE",
      });

      setSelectedIssue(null);
      setModal("");
      showNotice("Issue deleted.");
      await loadIssues();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openProfile() {
    if (!user) {
      openAuth("login");
      return;
    }

    setProfileForm({ name: user.name || "" });
    setError("");
    setModal("profile");
  }

  function scrollToReports() {
    document.getElementById("reports")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  const selectedReporterIsUser = Boolean(
    user &&
      selectedIssue &&
      (String(getReporterId(selectedIssue) ?? "") ===
        String(user.id ?? user._id ?? user.userId ?? "") ||
        (user.email &&
          selectedIssue.reporterEmail &&
          user.email.toLowerCase() ===
            selectedIssue.reporterEmail.toLowerCase()))
  );


  return (
    <div className="app-shell">
      <div className="announcement">
        <Leaf size={15} />
        <span>Small actions. Better neighbourhoods.</span>
        <span className="announcement-extra">
          Community powered, city focused.
        </span>
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="CivicFix home">
          <span className="brand-mark">
            <MapPin size={23} />
          </span>
          <span className="brand-copy">
            <strong>CivicFix</strong>
            <small>YOUR CITY, YOUR VOICE</small>
          </span>
        </a>

        <nav className={`nav-links ${mobileNav ? "nav-open" : ""}`}>
          <a href="#home" onClick={() => setMobileNav(false)}>Home</a>
          <a href="#categories" onClick={() => setMobileNav(false)}>Categories</a>
          <a href="#reports" onClick={() => setMobileNav(false)}>Reports</a>
          <a href="#about" onClick={() => setMobileNav(false)}>About</a>
          {isAdmin && (
            <a href="#admin" onClick={() => setMobileNav(false)}>
              <ShieldCheck size={16} /> Admin Dashboard
            </a>
          )}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <button
                className="button button-quiet profile-button"
                onClick={openProfile}
              >
                <UserRound size={17} />
                <span>{user.name || "My profile"}</span>
              </button>
              <button
                className="icon-button"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              className="button button-quiet"
              onClick={() => openAuth("login")}
            >
              <LogIn size={17} /> Log in
            </button>
          )}

          <button className="button button-primary header-cta" onClick={openReport}>
            <Plus size={18} /> Report an issue
          </button>

          <button
            className="mobile-toggle"
            onClick={() => setMobileNav((previous) => !previous)}
            aria-label="Toggle navigation"
          >
            {mobileNav ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" />
              A BETTER WAY TO FIX LOCAL ISSUES
            </div>
            <h1>
              Your neighbourhood.
              <br />
              <em>Better, together.</em>
            </h1>
            <p className="hero-lead">
              Spot a problem on your street? Help make your community safer,
              cleaner, and more connected by reporting it here.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary button-large"
                onClick={openReport}
              >
                Report a local issue <ArrowRight size={18} />
              </button>
              <button
                className="button button-secondary button-large"
                onClick={scrollToReports}
              >
                Explore reports
              </button>
            </div>
            <div className="hero-proof">
              <div className="proof-icons">
                <span><Users size={16} /></span>
                <span><Leaf size={16} /></span>
                <span><BadgeCheck size={16} /></span>
              </div>
              <p>
                <strong>Local voices, real impact.</strong>
                <br />
                Every report helps your community move forward.
              </p>
            </div>
          </div>

          <div className="hero-art">
            <div className="hero-image">
              <img
                src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85"
                alt="Modern city buildings and public spaces"
              />
              <div className="image-gradient" />
              <div className="image-label">
                <BadgeCheck size={25} />
                <span>
                  <strong>Better starts here</strong>
                  <small>Report · Track · Improve</small>
                </span>
              </div>
            </div>
            <div className="floating-stat">
              <Activity size={23} />
              <span>
                <strong>Every voice counts</strong>
                <small>Build a city we’re proud of</small>
              </span>
            </div>
          </div>
        </section>

        <section className="stats-wrap">
          <div className="stat">
            <span className="stat-icon"><AlertCircle size={21} /></span>
            <strong className="stat-number">{stats.total}</strong>
            <span className="stat-label">Reports shown</span>
          </div>
          <div className="stat">
            <span className="stat-icon"><Clock size={21} /></span>
            <strong className="stat-number">{stats.reported}</strong>
            <span className="stat-label">Reported</span>
          </div>
          <div className="stat">
            <span className="stat-icon"><Activity size={21} /></span>
            <strong className="stat-number">{stats.progress}</strong>
            <span className="stat-label">In progress</span>
          </div>
          <div className="stat">
            <span className="stat-icon"><CheckCircle2 size={21} /></span>
            <strong className="stat-number">{stats.resolved}</strong>
            <span className="stat-label">Resolved</span>
          </div>
        </section>

        <section className="section categories-section" id="categories">
          <div className="section-heading">
            <div>
              <span className="section-kicker">FIND YOUR CATEGORY</span>
              <h2>What needs fixing?</h2>
              <p>Choose an issue category to explore reports in your community.</p>
            </div>
          </div>

          <div className="category-grid">
            {CATEGORIES.map(({ name, detail, icon: Icon }) => (
              <button
                className={`category-card ${
                  category === name ? "category-active" : ""
                }`}
                key={name}
                onClick={() => {
                  setCategory(category === name ? "All" : name);
                  scrollToReports();
                }}
              >
                <span className="category-icon"><Icon size={24} /></span>
                <strong>{name}</strong>
                <small>{detail}</small>
                <ArrowRight className="category-arrow" size={18} />
              </button>
            ))}
          </div>
        </section>

        <section className="section reports-section" id="reports">
          <div className="section-heading reports-heading">
            <div>
              <span className="section-kicker">COMMUNITY IMPACT</span>
              <h2>Local reports</h2>
              <p>Discover problems reported by your community and follow their progress.</p>
            </div>
            <button className="button button-primary" onClick={openReport}>
              <Plus size={18} /> Submit a report
            </button>
          </div>

          <div className="filters-panel">
            <label className="search-box">
              <Search size={19} />
              <input
                type="search"
                placeholder="Search issues or locations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  className="icon-button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </label>

            <label className="filter-select">
              <Filter size={17} />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </label>

            <label className="filter-select">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="All">All statuses</option>
                {STATUSES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="filter-select">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          {error && !modal && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <LoaderCircle className="spinner" size={32} />
              <p>Loading community reports...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Search size={30} /></span>
              <h3>No reports found</h3>
              <p>Try another search or be the first to report an issue in your area.</p>
              <button className="button button-primary" onClick={openReport}>
                <Plus size={18} /> Report an issue
              </button>
            </div>
          ) : (
            <div className="issue-grid">
              {issues.map((issue) => {
                const Icon =
                  CATEGORIES.find((item) => item.name === issue.category)?.icon ||
                  Waves;

                return (
                  <article className="issue-card" key={getIssueId(issue)}>
                    <button
                      className="issue-card-main"
                      onClick={() => openIssue(issue)}
                    >
                      {issue.photoData || issue.imageUrl ? (
                        <img
                          className="issue-photo"
                          src={issue.photoData || issue.imageUrl}
                          alt={issue.title}
                        />
                      ) : (
                        <div className="issue-placeholder">
                          <Icon size={34} />
                        </div>
                      )}

                      <div className="issue-card-content">
                        <div className="issue-meta">
                          <span className="category-tag">{issue.category}</span>
                          <span
                            className={`status-tag status-${getIssueStatus(issue)
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {getIssueStatus(issue)}
                          </span>
                        </div>
                        <h3>{issue.title}</h3>
                        <p className="issue-description">
                          {issue.description || "No additional description provided."}
                        </p>
                        <div className="issue-location">
                          <MapPin size={15} />
                          <span>{issue.location || "Location not specified"}</span>
                        </div>
                      </div>
                    </button>

                    <div className="issue-card-footer">
                      <span>{formatDate(issue.createdAt)}</span>
                      <button
                        className="text-link"
                        onClick={() => openIssue(issue)}
                      >
                        View details <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {isAdmin && (
          <section className="section admin-section" id="admin">
            <div className="section-heading">
              <div>
                <span className="section-kicker">ADMINISTRATION</span>
                <h2>Admin dashboard</h2>
                <p>Review reports and manage their status.</p>
              </div>
              <span className="admin-badge">
                <ShieldCheck size={17} /> Administrator
              </span>
            </div>

            <div className="admin-stats">
              <div><span>Total reports</span><strong>{stats.total}</strong></div>
              <div><span>Awaiting action</span><strong>{stats.reported}</strong></div>
              <div><span>In progress</span><strong>{stats.progress}</strong></div>
              <div><span>Resolved</span><strong>{stats.resolved}</strong></div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Reporter</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={getIssueId(issue)}>
                      <td>{issue.title}</td>
                      <td>{issue.category}</td>
                      <td>{getReporterName(issue)}</td>
                      <td>{getIssueStatus(issue)}</td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => openIssue(issue)}
                        >
                          Manage <ArrowRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {issues.length === 0 && (
                <p className="table-empty">No reports available.</p>
              )}
            </div>

            <div className="section-heading" style={{ marginTop: 36 }}>
              <div>
                <span className="section-kicker">COMMUNITY VOICE</span>
                <h2>Feedback &amp; Ratings</h2>
                <p>Optional feedback submitted by residents on resolved issues.</p>
              </div>
            </div>

            <div className="admin-stats">
              <div>
                <span>Average rating</span>
                <strong>★ {averageRating} / 5</strong>
              </div>
              <div>
                <span>Total ratings</span>
                <strong>{feedbackIssues.length}</strong>
              </div>
              <div>
                <span>Review requests</span>
                <strong>{reviewRequests}</strong>
              </div>
            </div>

            {feedbackIssues.length === 0 ? (
              <p className="table-empty">
                No feedback submitted yet. Feedback is optional for residents.
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>Rating</th>
                      <th>Was it fixed?</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackIssues.map((issue) => (
                      <tr key={getIssueId(issue)}>
                        <td>{issue.title}</td>
                        <td>
                          <span style={{ color: "#D99A16" }}>
                            {"★".repeat(Number(issue.feedback.rating))}
                            {"☆".repeat(5 - Number(issue.feedback.rating))}
                          </span>
                          {" "}({issue.feedback.rating}/5)
                        </td>
                        <td>{issue.feedback.fixed || "Not specified"}</td>
                        <td>{issue.feedback.comment || "No comment"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="about-section" id="about">
          <div className="about-icon"><Leaf size={30} /></div>
          <span className="section-kicker">BETTER CITIES START WITH US</span>
          <h2>Your voice can make a difference.</h2>
          <p>
            CivicFix helps communities report local issues, follow progress,
            and work towards cleaner, safer public spaces.
          </p>
          <button className="button button-primary" onClick={openReport}>
            Make your first report <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark"><MapPin size={21} /></span>
          <span className="brand-copy">
            <strong>CivicFix</strong>
            <small>YOUR CITY, YOUR VOICE</small>
          </span>
        </a>
        <p>Building better neighbourhoods, one report at a time.</p>
        <span>© {new Date().getFullYear()} CivicFix</span>
      </footer>

      {notice && (
        <div className="toast-message">
          <CheckCircle2 size={19} />
          {notice}
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setModal("");
              setError("");
            }
          }}
        >
          <section className="modal-card" role="dialog" aria-modal="true">
            <button
              className="modal-close icon-button"
              onClick={() => {
                setModal("");
                setError("");
              }}
              aria-label="Close dialog"
              disabled={busy}
            >
              <X size={21} />
            </button>

            {modal === "auth" && (
              <>
                <div className="modal-heading">
                  <span className="modal-icon"><Users size={24} /></span>
                  <span className="section-kicker">JOIN YOUR COMMUNITY</span>
                  <h2>{authMode === "register" ? "Create an account" : "Welcome back"}</h2>
                  <p>
                    {authMode === "register"
                      ? "Create your account to report and track local issues."
                      : "Log in to submit reports and follow their progress."}
                  </p>
                </div>

                <form className="form-stack" onSubmit={submitAuth}>
                  {authMode === "register" && (
                    <label>
                      Full name
                      <input
                        name="name"
                        value={authForm.name}
                        onChange={handleAuthChange}
                        placeholder="Enter your full name"
                        maxLength={80}
                        required
                      />
                    </label>
                  )}
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      value={authForm.password}
                      onChange={handleAuthChange}
                      placeholder="Enter your password"
                      autoComplete={
                        authMode === "register" ? "new-password" : "current-password"
                      }
                      minLength={6}
                      required
                    />
                  </label>
                  {error && <p className="form-error">{error}</p>}
                  <button className="button button-primary form-submit" disabled={busy}>
                    {busy && <LoaderCircle className="spinner" size={18} />}
                    {busy
                      ? "Please wait..."
                      : authMode === "register"
                        ? "Create account"
                        : "Log in"}
                  </button>
                </form>

                <p className="auth-switch">
                  {authMode === "register"
                    ? "Already have an account?"
                    : "New to CivicFix?"}
                  <button
                    className="text-link"
                    onClick={() => {
                      setAuthMode(authMode === "register" ? "login" : "register");
                      setError("");
                    }}
                  >
                    {authMode === "register" ? "Log in" : "Create account"}
                  </button>
                </p>
              </>
            )}

            {modal === "report" && (
              <>
                <div className="modal-heading">
                  <span className="modal-icon"><Construction size={24} /></span>
                  <span className="section-kicker">HELP IMPROVE YOUR AREA</span>
                  <h2>Report a local issue</h2>
                  <p>Give your community enough information to understand the problem.</p>
                </div>

                <form className="form-stack" onSubmit={submitReport}>
                  <label>
                    Issue title
                    <input
                      name="title"
                      value={reportForm.title}
                      onChange={handleReportChange}
                      placeholder="e.g. Large pothole near the bus stop"
                      maxLength={120}
                      required
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Category
                      <select
                        name="category"
                        value={reportForm.category}
                        onChange={handleReportChange}
                      >
                        {CATEGORIES.map((item) => (
                          <option key={item.name} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Priority
                      <select
                        name="priority"
                        value={reportForm.priority}
                        onChange={handleReportChange}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Location
                    <input
                      name="location"
                      value={reportForm.location}
                      onChange={handleReportChange}
                      placeholder="Street, area or landmark"
                      maxLength={200}
                      required
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      name="description"
                      value={reportForm.description}
                      onChange={handleReportChange}
                      placeholder="Describe the issue and why it needs attention..."
                      rows={4}
                      maxLength={2000}
                      required
                    />
                  </label>

                  <label>
                    Photo (optional, maximum 1.5 MB)
                    <input type="file" accept="image/*" onChange={handlePhotoChange} />
                  </label>

                  {reportForm.photoData && (
                    <img
                      className="report-preview"
                      src={reportForm.photoData}
                      alt="Issue preview"
                    />
                  )}

                  {error && <p className="form-error">{error}</p>}

                  <button className="button button-primary form-submit" disabled={busy}>
                    {busy ? "Submitting..." : "Submit report"}
                  </button>
                </form>
              </>
            )}

            {modal === "profile" && user && (
              <>
                <div className="modal-heading">
                  <span className="modal-icon"><UserRound size={24} /></span>
                  <span className="section-kicker">YOUR ACCOUNT</span>
                  <h2>My profile</h2>
                  <p>View your CivicFix account information.</p>
                </div>

                <div className="profile-summary">
                  <span className="profile-avatar">
                    {(user.name || "U").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{user.name || "CivicFix user"}</strong>
                    <span>{user.email}</span>
                    <span className="role-tag">
                      {isAdmin ? "Administrator" : "Community member"}
                    </span>
                  </div>
                </div>

                <div className="profile-details">
                  <div><span>Account role</span><strong>{user.role || "user"}</strong></div>
                  <div><span>Reports shown</span><strong>{myIssues.length}</strong></div>
                </div>

                <button className="button button-quiet form-submit" onClick={logout}>
                  <LogOut size={17} /> Log out
                </button>
              </>
            )}

            {modal === "issue" && selectedIssue && (
              <>
                <div className="modal-heading issue-modal-heading">
                  <span className="section-kicker">{selectedIssue.category || "COMMUNITY REPORT"}</span>
                  <h2>{selectedIssue.title}</h2>
                  <p>
                    <MapPin size={16} />
                    {selectedIssue.location || "Location not specified"}
                  </p>
                </div>

                {(selectedIssue.photoData || selectedIssue.imageUrl) && (
                  <img
                    className="issue-detail-photo"
                    src={selectedIssue.photoData || selectedIssue.imageUrl}
                    alt={selectedIssue.title}
                  />
                )}

                <div className="issue-detail-meta">
                  <span
                    className={`status-tag status-${getIssueStatus(selectedIssue)
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {getIssueStatus(selectedIssue)}
                  </span>
                  <span className="category-tag">
                    {selectedIssue.priority || "Medium"} priority
                  </span>
                  <span className="detail-date">{formatDate(selectedIssue.createdAt)}</span>
                </div>

                <div className="issue-detail-description">
                  <h3>Description</h3>
                  <p>{selectedIssue.description || "No description provided."}</p>
                </div>

                <div className="issue-detail-description">
                  <h3>Status timeline</h3>
                  <div className="status-timeline">
                    {(
                      selectedIssue.statusHistory || [
                        {
                          status: "Reported",
                          note: "Issue reported",
                          changedAt: selectedIssue.createdAt,
                        },
                      ]
                    ).map((entry, index) => (
                      <div
                        className="timeline-entry"
                        key={`${entry.status}-${index}`}
                      >
                        <span className="timeline-dot" />
                        <div>
                          <strong>{entry.status}</strong>
                          {entry.note && <p>{entry.note}</p>}
                          <small>
                            {entry.changedAt
                              ? new Date(entry.changedAt).toLocaleString("en-IN")
                              : "Time unavailable"}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

{selectedIssue.status === "Resolved" && (
  <div className="issue-detail-description">
    <h3>Resolution details</h3>
    <p>
      {selectedIssue.resolutionNote ||
        "The issue has been marked as resolved."}
    </p>

    {selectedIssue.resolvedAt && (
      <small>
        Resolved on{" "}
        {new Date(selectedIssue.resolvedAt).toLocaleString("en-IN")}
      </small>
    )}
  </div>
)}







                {user &&
                  !isAdmin &&
                  selectedReporterIsUser &&
                  selectedIssue.status === "Resolved" &&
                  !selectedIssue.feedback?.submittedAt && (
                    <form className="form-stack feedback-form" onSubmit={submitFeedback}>
                      <h3>Was your issue fixed?</h3>
                      <p>Please share your feedback to help improve your community.</p>

                      <label>
                        Rating
                        <select
                          value={feedbackForm.rating}
                          onChange={(event) =>
                            setFeedbackForm({
                              ...feedbackForm,
                              rating: Number(event.target.value),
                            })
                          }
                        >
                          <option value={5}>5 — Excellent</option>
                          <option value={4}>4 — Good</option>
                          <option value={3}>3 — Average</option>
                          <option value={2}>2 — Poor</option>
                          <option value={1}>1 — Very poor</option>
                        </select>
                      </label>

                      <label>
                        Was the issue fixed?
                        <select
                          value={feedbackForm.fixed}
                          onChange={(event) =>
                            setFeedbackForm({
                              ...feedbackForm,
                              fixed: event.target.value,
                            })
                          }
                        >
                          <option value="yes">Yes, fully fixed</option>
                          <option value="partial">Partially fixed</option>
                          <option value="no">No, not fixed</option>
                        </select>
                      </label>

                      <label>
                        Additional comments (optional)
                        <textarea
                          value={feedbackForm.comment}
                          onChange={(event) =>
                            setFeedbackForm({
                              ...feedbackForm,
                              comment: event.target.value,
                            })
                          }
                          maxLength={1000}
                          rows={3}
                          placeholder="Tell us about your experience..."
                        />
                      </label>

                      {error && <p className="form-error">{error}</p>}

                      <button
                        className="button button-primary form-submit"
                        type="submit"
                        disabled={busy}
                      >
                        {busy ? "Submitting..." : "Submit feedback"}
                      </button>
                    </form>
                  )}

                {selectedIssue.feedback?.submittedAt && (
                  <div className="issue-detail-description">
                    <h3>Citizen feedback</h3>
                    <p>Rating: {selectedIssue.feedback.rating}/5</p>
                    <p>
                      Fixed:{" "}
                      {selectedIssue.feedback.fixed === "yes"
                        ? "Yes"
                        : selectedIssue.feedback.fixed === "partial"
                          ? "Partially"
                          : "No"}
                    </p>
                    {selectedIssue.feedback.comment && (
                      <p>{selectedIssue.feedback.comment}</p>
                    )}
                  </div>
                )}

                {user &&
                  !isAdmin &&
                  selectedReporterIsUser &&
                  selectedIssue.status === "Resolved" &&
                  !selectedIssue.reviewRequested && (
                    <button
                      className="button button-secondary form-submit"
                      onClick={() => requestReview(selectedIssue)}
                      disabled={busy}
                    >
                      Request another review
                    </button>
                  )}

                {isAdmin && (
                  <form className="admin-controls" onSubmit={updateStatus}>
                    <h3>Admin controls</h3>

                    <label>
                      Update status
                      <select
                        value={nextStatus}
                        onChange={(event) => setNextStatus(event.target.value)}
                        disabled={busy}
                      >
                        {STATUSES.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Resolution notes
                      <textarea
                        value={resolutionNote}
                        onChange={(event) => setResolutionNote(event.target.value)}
                        placeholder="Describe the work completed..."
                        maxLength={1000}
                        rows={3}
                        disabled={busy}
                      />
                    </label>

                    {error && <p className="form-error">{error}</p>}

                    <button
                      type="submit"
                      className="button button-primary form-submit"
                      disabled={busy}
                    >
                      {busy ? "Saving..." : "Save status"}
                    </button>

                    <button
                      type="button"
                      className="button button-danger form-submit"
                      onClick={() => deleteIssue(selectedIssue)}
                      disabled={busy}
                    >
                      <Trash2 size={17} /> Delete report
                    </button>
                  </form>
                )}

                {error && !isAdmin && <p className="form-error">{error}</p>}

                <button
                  className="button button-secondary form-submit"
                  onClick={() => {
                    setModal("");
                    setError("");
                  }}
                >
                  Close details
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
