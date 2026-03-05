/**
 * ClickSend SMS Delivery Status Check
 * 
 * Check the delivery status of an SMS message
 */

interface ClickSendStatusResponse {
  http_code: number;
  response_code: string;
  response_msg: string;
  data?: {
    messages: Array<{
      message_id: string;
      status: string;
      status_code: string;
      status_text: string;
      to: string;
      from: string;
      body: string;
      date: number;
      date_created: number;
      date_sent: number;
      date_finalized: number;
      direction: string;
      source: string;
      message_parts: number;
      message_price: string;
    }>;
  };
}

/**
 * Check SMS delivery status by message ID
 * Note: ClickSend doesn't have a direct endpoint for single message status
 * This function searches through recent messages to find the one with matching ID
 */
export async function checkSMSStatus(messageId: string): Promise<{
  success: boolean;
  status?: string;
  statusCode?: string;
  statusText?: string;
  error?: string;
}> {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    return {
      success: false,
      error: "ClickSend credentials not configured",
    };
  }

  try {
    // Get SMS history and find the message by ID
    const historyResult = await getSMSHistory(100); // Get last 100 messages
    
    if (!historyResult.success || !historyResult.messages) {
      return {
        success: false,
        error: historyResult.error || "Failed to get SMS history",
      };
    }

    // Find the message with matching ID
    const message = historyResult.messages.find((msg) => msg.messageId === messageId);

    if (!message) {
      return {
        success: false,
        error: `Message with ID ${messageId} not found in recent history. It may be older than 100 messages or still processing.`,
      };
    }

    return {
      success: true,
      status: message.status,
      statusText: message.statusText,
    };
  } catch (error) {
    console.error("Error checking SMS status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all SMS messages (for debugging)
 * Uses the ClickSend SMS history endpoint
 */
export async function getSMSHistory(limit: number = 10): Promise<{
  success: boolean;
  messages?: Array<{
    messageId: string;
    to: string;
    from: string;
    body: string;
    status: string;
    statusCode?: string;
    statusText: string;
    date: string;
  }>;
  error?: string;
}> {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    return {
      success: false,
      error: "ClickSend credentials not configured",
    };
  }

  try {
    const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
    
    // ClickSend API endpoint for SMS history
    const response = await fetch(`https://rest.clicksend.com/v3/sms/history?limit=${limit}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ClickSend API error:", response.status, errorText);
      return {
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
      };
    }

    const data: ClickSendStatusResponse = await response.json();

    if (data.http_code === 200 && data.response_code === "SUCCESS") {
      const messages = data.data?.messages?.map((msg) => ({
        messageId: msg.message_id,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status || "unknown",
        statusCode: msg.status_code,
        statusText: msg.status_text || msg.status || "Status unknown",
        date: new Date((msg.date || msg.date_created || Date.now() / 1000) * 1000).toISOString(),
      })) || [];

      return {
        success: true,
        messages,
      };
    } else {
      return {
        success: false,
        error: data.response_msg || "Failed to get SMS history",
      };
    }
  } catch (error) {
    console.error("Error getting SMS history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

