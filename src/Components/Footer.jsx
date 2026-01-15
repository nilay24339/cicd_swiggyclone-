import React from 'react';
import logo from '../Photos/Logo.png';

function Footer() {

  // IMPORTANT: Your Google Play image URL was cut in your message.
  // Paste the exact URL you already use in your project here without changing it.
  const playStoreImg =
    "https://media-assets.swiggy.com/swiggy/image/upload/fl_..."; // <-- replace with your exact existing URL

  const appStoreImg =
    "https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/portal/m/app_store.png";

  const styles = {
    topBar: {
      background: "linear-gradient(180deg, #f6f6f8 0%, #f1f0f4 100%)",
      borderBottom: "1px solid rgba(0,0,0,0.06)"
    },
    topTitle: {
      letterSpacing: "-0.6px",
      fontWeight: 900,
      color: "#2b2f36",
      lineHeight: 1.15
    },
    badgeImg: {
      height: "56px",
      width: "180px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
      transition: "transform 200ms ease, box-shadow 200ms ease"
    },
    bottom: {
      background: "radial-gradient(1200px 500px at 30% 0%, rgba(255, 255, 255, 0.08), transparent 60%), #02050c",
      borderTop: "1px solid rgba(255,255,255,0.08)"
    },
    colTitle: {
      color: "#ffffff",
      fontWeight: 700,
      letterSpacing: "-0.2px",
      marginBottom: "14px"
    },
    link: {
      color: "rgba(255,255,255,0.7)",
      marginBottom: "10px",
      cursor: "pointer",
      transition: "color 150ms ease, transform 150ms ease"
    },
    muted: {
      color: "rgba(255,255,255,0.65)"
    },
    brandRow: {
      gap: "10px"
    },
    cityBtn: {
      padding: "10px 14px",
      background: "transparent",
      color: "rgba(255,255,255,0.72)",
      border: "1px solid rgba(196, 198, 202, 0.18)",
      borderRadius: "999px",
      fontWeight: 600,
      transition: "all 180ms ease",
      display: "inline-flex",
      alignItems: "center",
      gap: "10px"
    }
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center w-100">

      {/* TOP DOWNLOAD BAR */}
      <div style={styles.topBar} className="w-100 d-flex justify-content-center align-items-center">
        <div className="w-75 d-flex flex-column flex-lg-row justify-content-between align-items-center py-4">
          <h3 style={styles.topTitle} className="mb-3 mb-lg-0 text-center text-lg-start">
            For better experience, download <br className="d-none d-lg-block" /> the Swiggy app now
          </h3>

          <div className="d-flex align-items-center gap-3">
            <img
              className="img-fluid"
              src={playStoreImg}
              alt="Get it on Google Play"
              style={styles.badgeImg}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
              }}
            />

            <img
              className="img-fluid"
              src={appStoreImg}
              alt="Download on the App Store"
              style={styles.badgeImg}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 30px rgba(0,0,0,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.12)";
              }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div style={styles.bottom} className="w-100 d-flex justify-content-center align-items-center">
        <div className="w-75 py-5">

          <div className="row g-4">
            {/* Brand */}
            <div className="col-12 col-md-6 col-lg-3">
              <div className="d-flex align-items-center" style={styles.brandRow}>
                <img width="34" src={logo} alt="Logo" />
                <h3 className="fw-bolder m-0" style={{ color: "white", letterSpacing: "-0.6px" }}>
                  Swiggy
                </h3>
              </div>
              <p className="mt-3 mb-0" style={styles.muted}>
                © 2023 Bundl Technologies Pvt. Ltd
              </p>
            </div>

            {/* Company */}
            <div className="col-6 col-lg-3">
              <h5 style={styles.colTitle}>Company</h5>
              {["About", "Careers", "Team", "Swiggy One", "Swiggy Instamart", "Swiggy Genie"].map((item) => (
                <div
                  key={item}
                  style={styles.link}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Contact + Legal */}
            <div className="col-6 col-lg-3">
              <h5 style={styles.colTitle}>Contact us</h5>
              {["Help & Support", "Partner with us", "Ride with us"].map((item) => (
                <div
                  key={item}
                  style={styles.link}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {item}
                </div>
              ))}

              <h5 style={{ ...styles.colTitle, marginTop: "22px" }}>Legal</h5>
              {["Terms & Conditions", "Cokkie Policy", "Privacy Policy"].map((item) => (
                <div
                  key={item}
                  style={styles.link}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Cities */}
            <div className="col-12 col-lg-3">
              <h5 style={styles.colTitle}>We deliver to:</h5>
              {["Bangalore", "Gurgaon", "Hyderabad", "Delhi", "Mumbai", "Pune"].map((city) => (
                <div
                  key={city}
                  style={styles.link}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {city}
                </div>
              ))}

              <button
                style={styles.cityBtn}
                className="mt-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(196, 198, 202, 0.18)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.72)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                589 cities
                <span style={{ opacity: 0.9 }}>▾</span>
              </button>
            </div>
          </div>

          {/* Bottom divider + small note (optional but looks professional) */}
          <div
            className="mt-5 pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}
          >
            Built for learning/demo purposes. All brand assets belong to their respective owners.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Footer;
export default Footer
