export async function updateGMBLocation(
  actionType: string,
  updateData: Record<string, any>,
  gmbAccountId: string,
  locationId: string,
  accessToken: string
) {
  // v4 base for media/posts/reviews (active/unchanged)
  const v4Base = `https://mybusiness.googleapis.com/v4/accounts/${gmbAccountId}/locations/${locationId}`;

  // v1 base for location info/attributes (no accountId in path)
  const v1Base = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}`;

  let updateMask: string[] = [];
  let requestBody: Record<string, any> = {};

  // Helper to parse time string (e.g., "0900") to TimeOfDay object
  const parseTime = (timeStr: string) => {
    if (!timeStr || timeStr === "closed") return null;
    const hours = parseInt(timeStr.substring(0, 2));
    const minutes = parseInt(timeStr.substring(2, 4));
    return { hours, minutes, seconds: 0, nanos: 0 };
  };

  switch (actionType) {
    case "website": {
      requestBody.websiteUri = updateData.website;
      updateMask = ["websiteUri"];
      break;
    }

    case "appointment": {
      const appointmentUrl = updateData.appointment?.trim();

      if (!appointmentUrl) {
        throw new Error("Appointment link is required");
      }

      try {
        const url = new URL(appointmentUrl);
        if (!/^https?:\/\//.test(url.href)) {
          throw new Error("Appointment link must start with http:// or https://");
        }
      } catch {
        throw new Error("Invalid appointment URL format");
      }

      requestBody.websiteUri = appointmentUrl;
      updateMask = ["websiteUri"];
      break;
    }

    case "chat": {
      const chatType = updateData.chatType;
      const chatValue = updateData.chatValue?.trim();

      if (!chatType || !chatValue) {
        throw new Error("Chat type and value are required");
      }

      let attributeName: string;
      let uri: string;

      if (chatType === "whatsapp") {
        attributeName = "attributes/url_whatsapp";
        uri = chatValue;

        if (!uri.startsWith("https://wa.me/")) {
          throw new Error("WhatsApp URL must start with https://wa.me/");
        }
      } else if (chatType === "sms") {
        attributeName = "attributes/url_text_messaging";
        const phoneNumber = chatValue.replace(/[\s\-()]/g, "");
        uri = `sms:${phoneNumber}`;
      } else {
        throw new Error("Invalid chat type. Must be 'whatsapp' or 'sms'");
      }

      const attributesUrl = `${v1Base}/attributes?attributeMask=${attributeName}`;

      requestBody = {
        name: `locations/${locationId}/attributes`,
        attributes: [
          {
            name: attributeName,
            values: [],
            uriValues: [
              {
                uri: uri
              }
            ]
          }
        ]
      };

      const response = await fetch(attributesUrl, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }

      if (!response.ok) {
        const error = await response.json();
        console.error("Chat attribute update failed:", error);
        throw new Error(`GMB API error (${response.status}): ${JSON.stringify(error)}`);
      }

      return await response.json();
    }

    case "phone": {
      requestBody.phoneNumbers = {
        primaryPhone: updateData.phone,
        additionalPhones: []
      };
      updateMask = ["phoneNumbers"];
      break;
    }

    case "description": {
      requestBody.profile = {
        description: updateData.description
      };
      updateMask = ["profile.description"];
      break;
    }

    case "hours": {
      const hours = updateData.businessHours;
      const regularHours: any = { periods: [] };

      const dayMap: Record<string, string> = {
        monday: "MONDAY",
        tuesday: "TUESDAY",
        wednesday: "WEDNESDAY",
        thursday: "THURSDAY",
        friday: "FRIDAY",
        saturday: "SATURDAY",
        sunday: "SUNDAY"
      };

      for (const [day, dayHours] of Object.entries(hours)) {
        const h = dayHours as any;
        if (!h.closed && h.open && h.close) {  // Added checks
          regularHours.periods.push({
            openDay: dayMap[day],
            openTime: parseTime(h.open),  // Fixed: Parse to TimeOfDay object
            closeDay: dayMap[day],
            closeTime: parseTime(h.close)  // Fixed: Parse to TimeOfDay object
          });
        }
      }

      requestBody.regularHours = regularHours;
      updateMask = ["regularHours"];
      break;
    }

    case "services": {
      // Step 1: Fetch current location to preserve primary/additional categories
      const readMask = "categories";
      const getResponse = await fetch(`${v1Base}?readMask=${readMask}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!getResponse.ok) {
        const getError = await getResponse.json();
        throw new Error(`Failed to fetch current location: ${JSON.stringify(getError)}`);
      }

      const currentLocation = await getResponse.json();
      const primaryCategory = currentLocation.categories?.primaryCategory;
      const currentAdditional = currentLocation.categories?.additionalCategories || [];

      if (!primaryCategory) {
        throw new Error("No primary category found on location—set one first via dashboard.");
      }

      // Step 2: Fetch available categories to get GCIDs
      const region = "US";
      const language = "en";
      const categoriesListUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/categories?languageCode=${language}&regionCode=${region}&view=BASIC`;
      const listResponse = await fetch(categoriesListUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (!listResponse.ok) {
        const listError = await listResponse.json();
        throw new Error(`Failed to fetch categories: ${JSON.stringify(listError)}`);
      }

      const { categories } = await listResponse.json();

      // Step 3: Parse services (handle string or array)
      const serviceNames = typeof updateData.services === "string"
        ? updateData.services.split(",").map(s => s.trim())
        : Array.isArray(updateData.services) ? updateData.services : [];

      if (serviceNames.length === 0) {
        throw new Error("No services provided");
      }

      // Step 4: Match services to GCIDs (case-insensitive partial match on displayName)
      const newCategories: any[] = [];
      const existingNames = currentAdditional.map((cat: any) => cat.displayName?.toLowerCase() || cat.name);

      for (const service of serviceNames) {
        if (existingNames.includes(service.toLowerCase())) {
          continue;
        }

        const matched = categories.find((cat: any) => {
          const serviceLower = service.toLowerCase();
          const catLower = cat.displayName?.toLowerCase();
          return (
            catLower === serviceLower ||  // Exact match
            catLower.includes(serviceLower) ||  // Category contains service (e.g., "computer support" includes "it"? No, but expandable)
            serviceLower.includes(catLower) ||  // Service contains category (rare)
            // Add fuzzy logic if needed, e.g., via a simple word overlap check
            serviceLower.split(' ').some(word => catLower.includes(word))
          );
        });

        if (!matched) {
          throw new Error(`No matching category found for "${service}". Available: ${categories.slice(0, 5).map((c: any) => c.displayName).join(", ")}... Use exact names (e.g., "computer repair" for IT).`);
        }

        newCategories.push({
          name: matched.name,  // GCID (required)
          displayName: matched.displayName  // Use API's display name
        });
      }

      // Step 5: Build full categories object
      const updatedAdditional = [...currentAdditional, ...newCategories];
      requestBody.categories = {
        primaryCategory,
        additionalCategories: updatedAdditional
      };
      updateMask = ["categories"];
      break;
    }

    // Photo, video, post, reviewsReply cases unchanged (v4 working)
    case "photo": {
      const mediaUrl = `${v4Base}/media`;

      for (const photo of updateData.photos) {
        if (!photo.url) continue;

        const photoBody = {
          locationAssociation: {
            category: "ADDITIONAL",
          },
          mediaFormat: "PHOTO",
          sourceUrl: photo.url.trim(),
        };

        const response = await fetch(mediaUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(photoBody),
        });

        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response:", text.substring(0, 500));
          throw new Error(`API returned non-JSON response. Status: ${response.status}`);
        }

        const result = await response.json();

        if (!response.ok) {
          console.error("Photo upload failed:", result);
          throw new Error(`GMB API error (${response.status}): ${JSON.stringify(result)}`);
        }
      }

      return;
    }

    case "video": {
      const mediaUrl = `${v4Base}/media`;

      if (!updateData.videoUrl) {
        throw new Error("Video URL missing or invalid");
      }

      const videoBody = {
        locationAssociation: {
          category: "ADDITIONAL",
        },
        mediaFormat: "VIDEO",
        sourceUrl: updateData.videoUrl.trim(),
      };

      const response = await fetch(mediaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(videoBody),
      });

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }

      const result = await response.json();

      if (!response.ok) {
        console.error("Video upload failed:", result);
        throw new Error(`GMB API error (${response.status}): ${JSON.stringify(result)}`);
      }

      return;
    }

    case "post": {
      const postsUrl = `${v4Base}/localPosts`;

      const postBody: any = {
        languageCode: "en",
        summary: updateData.postTitle || updateData.postDescription,
      };

      if (updateData.postTopicType) {
        postBody.topicType = updateData.postTopicType;
      }

      if (updateData.postActionButton && updateData.postActionButton !== "NO_ACTION") {
        postBody.callToAction = {
          actionType: updateData.postActionButton,
        };

        if (updateData.postActionLink) {
          postBody.callToAction.url = updateData.postActionLink;
        }

        if (updateData.postCallPhone) {
          postBody.callToAction.phoneNumber = updateData.postCallPhone;
        }
      }

      if (updateData.postImageUrl) {
        postBody.media = [
          {
            mediaFormat: "PHOTO",
            sourceUrl: updateData.postImageUrl,
          },
        ];
      }

      if (updateData.postCallToAction) {
        postBody.event = {
          title: updateData.postCallToAction,
        };
      }

      const response = await fetch(postsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postBody),
      });

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GMB API error (${response.status}): ${JSON.stringify(error)}`);
      }

      return;
    }


    case "reviewsReply": {
      const reviewUrl = `${v4Base}/reviews/${updateData.reviewId}/reply`;
      const replyBody = {
        comment: updateData.reviewsReply
      };

      const response = await fetch(reviewUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(replyBody)
      });

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GMB API error (${response.status}): ${JSON.stringify(error)}`);
      }

      return;
    }


    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }

  // Generic v1 PATCH for location info
  const url = `${v1Base}?updateMask=${updateMask.join(",")}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  console.log("Response status:", response.status);

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const text = await response.text();
    console.error("Non-JSON response:", text.substring(0, 500));
    throw new Error(`API returned non-JSON response. Status: ${response.status}`);
  }

  if (!response.ok) {
    const error = await response.json();
    console.error("Update failed:", error);
    throw new Error(`GMB API error (${response.status}): ${JSON.stringify(error)}`);
  }

  return await response.json();
}