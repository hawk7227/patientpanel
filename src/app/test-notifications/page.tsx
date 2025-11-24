"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader2, Info } from "lucide-react";

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    email?: { success: boolean; messageId?: string; error?: string };
    sms?: { success: boolean; messageId?: string; formattedPhone?: string; error?: string; details?: unknown };
  } | null>(null);
  const [testType, setTestType] = useState<"email" | "sms" | "both">("both");
  const [email, setEmail] = useState("fiverrsajjad@gmail.com");
  const [phone, setPhone] = useState("+9231334443536");
  const [smsTemplate, setSmsTemplate] = useState<string>("");

  useEffect(() => {
    // Fetch current SMS template
    fetch("/api/sms-template")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSmsTemplate(data.template);
        }
      })
      .catch((err) => console.error("Error fetching SMS template:", err));
  }, []);

  const handleTest = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch("/api/test-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testType,
          email,
          phone,
        }),
      });

      const data = await response.json();
      setResults(data.results || {});
    } catch (error) {
      console.error("Error testing notifications:", error);
      setResults({
        email: { success: false, error: "Failed to send test request" },
        sms: { success: false, error: "Failed to send test request" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-[#0a0f1a] border-2 border-primary-teal/50 rounded-2xl p-8 shadow-[0_0_30px_rgba(0,203,169,0.2)]">
          <h1 className="text-3xl font-bold text-primary-teal mb-6">
            Test Email & SMS Notifications
          </h1>

          <div className="space-y-6">
            {/* Test Type Selection */}
            <div>
              <label className="block text-white mb-2 font-semibold">
                Test Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="testType"
                    value="email"
                    checked={testType === "email"}
                    onChange={(e) => setTestType(e.target.value as "email")}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Email Only</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="testType"
                    value="sms"
                    checked={testType === "sms"}
                    onChange={(e) => setTestType(e.target.value as "sms")}
                    className="mr-2"
                  />
                  <span className="text-gray-300">SMS Only</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="testType"
                    value="both"
                    checked={testType === "both"}
                    onChange={(e) => setTestType(e.target.value as "both")}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Both</span>
                </label>
              </div>
            </div>

            {/* Email Input */}
            {(testType === "email" || testType === "both") && (
              <div>
                <label className="block text-white mb-2 font-semibold">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0d1218] border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-teal"
                  placeholder="fiverrsajjad@gmail.com"
                />
              </div>
            )}

            {/* Phone Input */}
            {(testType === "sms" || testType === "both") && (
              <div>
                <label className="block text-white mb-2 font-semibold">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0d1218] border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-teal"
                  placeholder="+9231334443536"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Format: +1234567890 (E.164 format)
                </p>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={handleTest}
              disabled={loading}
              className="w-full bg-primary-teal text-black font-bold py-3 px-6 rounded-lg hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Test Notifications"
              )}
            </button>

            {/* Results */}
            {results && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">Results</h2>

                {/* Email Result */}
                {results.email && (
                  <div className="bg-[#0d1218] border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {results.email.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-semibold text-white">Email</span>
                    </div>
                    {results.email.success ? (
                      <div className="text-green-400 text-sm">
                        ✓ Email sent successfully
                        {results.email.messageId && (
                          <p className="text-gray-400 mt-1">
                            Message ID: {results.email.messageId}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-400 text-sm">
                        ✗ Failed to send email: {results.email.error}
                      </div>
                    )}
                  </div>
                )}

                {/* SMS Result */}
                {results.sms && (
                  <div className="bg-[#0d1218] border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {results.sms.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-semibold text-white">SMS</span>
                    </div>
                    {results.sms.success ? (
                      <div className="text-green-400 text-sm space-y-2">
                        <div>✓ SMS sent successfully</div>
                        {results.sms.messageId && (
                          <div className="text-gray-400">
                            <p className="mb-1">Message ID: {results.sms.messageId}</p>
                            <a
                              href={`/api/check-sms-status?messageId=${results.sms.messageId}`}
                              target="_blank"
                              className="text-primary-teal hover:underline text-xs"
                            >
                              Check Delivery Status →
                            </a>
                          </div>
                        )}
                        {results.sms.formattedPhone && (
                          <p className="text-gray-500 text-xs">
                            Formatted Phone: {results.sms.formattedPhone}
                          </p>
                        )}
                        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded text-yellow-300 text-xs">
                          <strong>Note:</strong> If SMS not received, check:
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>ClickSend account has credits</li>
                            <li>Phone number is correct: {phone}</li>
                            <li>Sender ID approved for your country</li>
                            <li>Check spam/blocked messages</li>
                            <li>Wait 1-2 minutes for delivery</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-400 text-sm">
                        ✗ Failed to send SMS: {results.sms.error}
                        {results.sms.details && (
                          <pre className="text-xs mt-2 text-gray-400 overflow-auto">
                            {JSON.stringify(results.sms.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SMS Template Info */}
          {smsTemplate && (
            <div className="mt-6 p-4 bg-[#0d1218] border border-primary-teal/30 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <Info className="w-5 h-5 text-primary-teal mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Current SMS Template</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    Customize via <code className="bg-black/30 px-1 rounded">SMS_TEMPLATE</code> in <code className="bg-black/30 px-1 rounded">.env.local</code>
                  </p>
                  <div className="bg-black/30 p-2 rounded text-xs text-gray-400 font-mono break-all">
                    {smsTemplate}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Placeholders: {"{"}patientName{"}"}, {"{"}appointmentDate{"}"}, {"{"}appointmentTime{"}"}, {"{"}appointmentLink{"}"}, {"{"}zoomMeetingUrl{"}"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Test Links */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <h3 className="text-white font-semibold mb-3">Quick Test URLs</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Test Email:</span>
                <a
                  href="/api/test-notifications?type=email&email=fiverrsajjad@gmail.com"
                  target="_blank"
                  className="text-primary-teal hover:underline ml-2"
                >
                  /api/test-notifications?type=email&email=fiverrsajjad@gmail.com
                </a>
              </div>
              <div>
                <span className="text-gray-400">Test SMS:</span>
                <a
                  href="/api/test-notifications?type=sms&phone=%2B9231334443536"
                  target="_blank"
                  className="text-primary-teal hover:underline ml-2"
                >
                  /api/test-notifications?type=sms&phone=+9231334443536
                </a>
              </div>
              <div>
                <span className="text-gray-400">Test Both:</span>
                <a
                  href="/api/test-notifications?type=both&email=fiverrsajjad@gmail.com&phone=%2B9231334443536"
                  target="_blank"
                  className="text-primary-teal hover:underline ml-2"
                >
                  /api/test-notifications?type=both
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

