/**
 * ClickSend SMS Integration
 * 
 * Documentation: https://developers.clicksend.com/docs/rest/v3/#send-sms
 */

interface SendSMSOptions {
  to: string; // Phone number in E.164 format (e.g., +1234567890)
  message: string;
  from?: string; // Optional sender ID
}

interface ClickSendResponse {
  http_code: number;
  response_code: string;
  response_msg: string;
  data?: {
    total_price: number;
    total_count: number;
    queued_count: number;
    messages: Array<{
      direction: string;
      date: number;
      to: string;
      body: string;
      from: string;
      schedule: string;
      message_id: string;
      message_parts: number;
      message_price: string;
      custom_string: string;
      user_id: number;
      subaccount_id: number;
    }>;
  };
}

/**
 * Send SMS via ClickSend API
 */
export async function sendSMS({ to, message, from }: SendSMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    console.error("ClickSend credentials not configured");
    return {
      success: false,
      error: "SMS service not configured",
    };
  }

  // Format phone number to E.164 format (ensure it starts with +)
  // Remove any non-digit characters except +
  let cleaned = to.replace(/[^\d+]/g, "");
  
  // If it doesn't start with +, add it
  if (!cleaned.startsWith("+")) {
    // If it starts with 1 (US country code), add + before it
    // Otherwise, assume US number and add +1
    if (cleaned.startsWith("1") && cleaned.length === 11) {
      cleaned = `+${cleaned}`;
    } else if (cleaned.length === 10) {
      // 10-digit US number, add +1
      cleaned = `+1${cleaned}`;
    } else {
      // Try to add + anyway
      cleaned = `+${cleaned}`;
    }
  }
  
  const formattedPhone = cleaned;

  try {
    const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
    
    const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            source: "sdk",
            from: from || process.env.CLICKSEND_SENDER_ID || "Medazon",
            body: message,
            to: formattedPhone,
          },
        ],
      }),
    });

    const data: ClickSendResponse = await response.json();

    if (data.http_code === 200 && data.response_code === "SUCCESS") {
      const messageId = data.data?.messages?.[0]?.message_id;
      return {
        success: true,
        messageId,
      };
    } else {
      console.error("ClickSend API error:", data);
      return {
        success: false,
        error: data.response_msg || "Failed to send SMS",
      };
    }
  } catch (error) {
    console.error("Error sending SMS via ClickSend:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

