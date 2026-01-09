/**
 * Zoom API integration for creating scheduled meetings
 */

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone: string;
  password?: string;
}

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Generate OAuth access token for Zoom Server-to-Server OAuth
 */
async function getZoomAccessToken(): Promise<string> {
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;

  if (!apiKey || !apiSecret || !accountId) {
    throw new Error("Zoom credentials are missing. Please check environment variables.");
  }

  // Create Basic Auth header (base64 encoded apiKey:apiSecret)
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoom token error:", errorText);
      throw new Error(`Failed to get Zoom access token: ${response.status} ${response.statusText}`);
    }

    const data: ZoomTokenResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting Zoom access token:", error);
    throw error;
  }
}

/**
 * Create a scheduled Zoom meeting
 */
export async function createZoomMeeting({
  topic,
  startTime,
  duration = 30,
  timezone = "America/New_York",
  patientEmail,
  patientName,
}: {
  topic: string;
  startTime: string; // ISO 8601 format (e.g., "2024-01-15T14:00:00Z")
  duration?: number; // in minutes
  timezone?: string;
  patientEmail?: string;
  patientName?: string;
}): Promise<ZoomMeetingResponse> {
  try {
    const accessToken = await getZoomAccessToken();

    // Format start time for Zoom API (must be in ISO 8601 format)
    const meetingData: {
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      password?: string;
      settings: {
        host_video: boolean;
        participant_video: boolean;
        join_before_host: boolean;
        mute_upon_entry: boolean;
        waiting_room: boolean;
        approval_type: number;
        audio: string;
        auto_recording: string;
        meeting_authentication: boolean;
        registrants_confirmation_email: boolean;
      };
    } = {
      topic: topic || "Medical Consultation",
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration: duration,
      timezone: timezone,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false, // Meeting only starts when doctor uses start_url
        mute_upon_entry: false,
        waiting_room: false, // No waiting room so anyone can join (after host starts)
        approval_type: 2, // No registration required - anyone can join directly
        audio: "both", // Both telephony and VOIP
        auto_recording: "cloud", // Enable cloud recording
        meeting_authentication: false, // Allow anyone to join with password
        registrants_confirmation_email: false,
      },
    };

    // Create meeting on default Zoom account
    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meetingData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zoom meeting creation error:", errorText);
      throw new Error(`Failed to create Zoom meeting: ${response.status} ${response.statusText}`);
    }

    const meeting: ZoomMeetingResponse = await response.json();
    return meeting;
  } catch (error) {
    console.error("Error creating Zoom meeting:", error);
    throw error;
  }
}

