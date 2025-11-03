import { NextResponse } from "next/server"
import { prisma } from "../../../../../../lib/prisma"
import { stackServerApp } from "@/stack"
import { checkMilestones, awardAchievement, calculateLevel, calculateStreak } from "@/helpers/gamification"
import axios from "axios"
import FormData from "form-data"
import { updateGMBLocation } from "@/helpers/updateGMBLocation"

let gmbUpdateNote = null;

// Helper functions
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function cleanLocationId(locationId: string): string {
  return locationId.replace(/^locations\//, '');
}

function cleanAccountId(accountId: string): string {
  return accountId.replace(/^accounts\//, '');
}

// ImageKit upload helper
async function uploadToImageKit(file: File, fileName: string): Promise<{ url: string; fileId: string }> {
  try {
    const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'
    const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY
    const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY

    if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY) {
      throw new Error('ImageKit credentials not configured')
    }

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64File = buffer.toString('base64')

    // Create form data for ImageKit
    const formData = new URLSearchParams()
    formData.append('file', base64File)
    formData.append('fileName', fileName)
    formData.append('folder', '/gmb-uploads')

    const response = await axios.post(IMAGEKIT_UPLOAD_URL, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`
      }
    })

    return {
      url: response.data.url,
      fileId: response.data.fileId
    }
  } catch (error: any) {
    console.error('ImageKit upload error:', error.response?.data || error.message)
    throw new Error(`Failed to upload to ImageKit: ${error.response?.data?.message || error.message}`)
  }
}

// ImageKit delete helper
async function deleteFromImageKit(fileId: string): Promise<void> {
  try {
    const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY

    if (!IMAGEKIT_PRIVATE_KEY) {
      throw new Error('ImageKit credentials not configured')
    }

    await axios.delete(`https://api.imagekit.io/v1/files/${fileId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`
      }
    })
  } catch (error: any) {
    console.error('ImageKit delete error:', error.message)
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const uploadedFiles: string[] = [];

  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params in Next.js 15+
    const params = await context.params;
    const { taskId } = params;

    const { searchParams } = new URL(req.url);
    const gmbAccountId = searchParams.get("gmbAccountId");
    const accessToken = searchParams.get("accessToken");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const locationId = formData.get("locationId") as string;
    const actionType = formData.get("actionType") as string;

    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    if (!actionType) {
      return NextResponse.json({ error: "actionType is required" }, { status: 400 });
    }

    // Fetch the task - use findFirst to include userId filter
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === "completed") {
      return NextResponse.json({ error: "Task already completed" }, { status: 400 });
    }

    // Validate and extract data based on action type
    const updateData: Record<string, any> = {};

    switch (actionType) {
      case "photo": {
        const photos = formData.getAll("photos") as File[];
        if (!photos || photos.length === 0) {
          return NextResponse.json({ error: "No photos provided" }, { status: 400 });
        }
        if (photos.length > 20) {
          return NextResponse.json({ error: "Maximum 20 photos allowed" }, { status: 400 });
        }

        const photoUrls = [];
        for (const photo of photos) {
          if (photo.size > 10 * 1024 * 1024) {
            for (const fileId of uploadedFiles) {
              await deleteFromImageKit(fileId);
            }
            return NextResponse.json({ error: "Photo size cannot exceed 10MB" }, { status: 400 });
          }

          const uploaded = await uploadToImageKit(photo, `photo_${Date.now()}_${photo.name}`);
          photoUrls.push(uploaded);
          uploadedFiles.push(uploaded.fileId);
        }

        updateData.photos = photoUrls;
        break;
      }

      case "video": {
        const video = formData.get("videos") as File;
        if (!video) {
          return NextResponse.json({ error: "No video provided" }, { status: 400 });
        }
        if (video.size > 100 * 1024 * 1024) {
          return NextResponse.json({ error: "Video size cannot exceed 40MB" }, { status: 400 });
        }

        const uploaded = await uploadToImageKit(video, `video_${Date.now()}_${video.name}`);
        updateData.videoUrl = uploaded.url;
        updateData.videoFileId = uploaded.fileId;
        uploadedFiles.push(uploaded.fileId);
        break;
      }

      case "description": {
        const description = formData.get("description") as string;
        if (!description || description.trim().length < 10) {
          return NextResponse.json({ error: "Description must be at least 10 characters" }, { status: 400 });
        }
        if (description.trim().length > 5000) {
          return NextResponse.json({ error: "Description cannot exceed 5000 characters" }, { status: 400 });
        }
        updateData.description = description.trim();
        break;
      }

      case "phone": {
        const phone = formData.get("phone") as string;
        if (!phone || !/^[\d\s\-+()]{10,}$/.test(phone)) {
          return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
        }
        updateData.phone = phone.trim();
        break;
      }

      case "website": {
        const website = formData.get("website") as string;
        if (!website) {
          return NextResponse.json({ error: "Website URL is required" }, { status: 400 });
        }
        try {
          new URL(website);
          updateData.website = website.trim();
        } catch {
          return NextResponse.json({ error: "Invalid website URL format" }, { status: 400 });
        }
        break;
      }

      case "services": {
        const services = formData.get("services") as string;
        if (!services || services.trim().length < 5) {
          return NextResponse.json({ error: "Services must be at least 5 characters" }, { status: 400 });
        }
        if (services.trim().length > 2000) {
          return NextResponse.json({ error: "Services cannot exceed 2000 characters" }, { status: 400 });
        }
        updateData.services = services.trim().split('\n').filter(s => s.trim());
        break;
      }

      case "hours": {
        const businessHours = formData.get("businessHours") as string;
        if (!businessHours) {
          return NextResponse.json({ error: "Business hours are required" }, { status: 400 });
        }
        try {
          const hours = JSON.parse(businessHours);
          for (const [day, dayHours] of Object.entries(hours)) {
            const h = dayHours as any;
            if (!h.closed && h.open >= h.close) {
              return NextResponse.json({ error: `Closing time must be after opening time for ${day}` }, { status: 400 });
            }
          }
          updateData.businessHours = hours;
        } catch {
          return NextResponse.json({ error: "Invalid business hours format" }, { status: 400 });
        }
        break;
      }

      case "reviewsReply": {
        const reviewsReply = formData.get("reviewsReply") as string;
        const reviewId = formData.get("reviewId") as string;

        if (!reviewsReply || reviewsReply.trim().length < 5) {
          return NextResponse.json({ error: "Reply must be at least 5 characters" }, { status: 400 });
        }
        if (reviewsReply.trim().length > 1000) {
          return NextResponse.json({ error: "Reply cannot exceed 1000 characters" }, { status: 400 });
        }
        if (!reviewId) {
          return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
        }
        updateData.reviewsReply = reviewsReply.trim();
        updateData.reviewId = reviewId;
        break;
      }

      case "socialLinks": {
        const socialLinks = formData.get("socialLinks") as string;
        if (!socialLinks) {
          return NextResponse.json({ error: "Social links are required" }, { status: 400 });
        }
        try {
          const links = JSON.parse(socialLinks);
          for (const [platform, url] of Object.entries(links)) {
            if (url && typeof url === 'string' && url.trim()) {
              try {
                new URL(url);
              } catch {
                return NextResponse.json({ error: `Invalid URL for ${platform}` }, { status: 400 });
              }
            }
          }
          updateData.socialLinks = links;
          updateData.socialLinksText = Object.entries(links)
            .filter(([_, url]) => url)
            .map(([platform, url]) => `${platform}: ${url}`)
            .join('\n');
        } catch {
          return NextResponse.json({ error: "Invalid social links format" }, { status: 400 });
        }
        break;
      }

      case "post": {
        const postTitle = formData.get("postTitle") as string;
        const postDescription = formData.get("postDescription") as string;
        const postImageUrl = formData.get("postImageUrl") as string;
        const postImage = formData.get("postImage") as File;
        const postUrl = formData.get("postUrl") as string;

        // New fields
        const postTopicType = formData.get("postTopicType") as string;
        const postActionButton = formData.get("postActionButton") as string;
        const postActionLink = formData.get("postActionLink") as string;
        const postCallPhone = formData.get("postCallPhone") as string;
        const postCallToAction = formData.get("postCallToAction") as string;

        // Basic validation
        if (!postTitle || postTitle.trim().length < 5) {
          return NextResponse.json({ error: "Post title must be at least 5 characters" }, { status: 400 });
        }
        if (postTitle.trim().length > 200) {
          return NextResponse.json({ error: "Post title cannot exceed 200 characters" }, { status: 400 });
        }

        // Assign core fields
        updateData.postTitle = postTitle.trim();
        updateData.postDescription = postDescription?.trim() || "";
        updateData.postUrl = postUrl?.trim() || "";

        // Assign new CTA and topic fields
        updateData.postTopicType = postTopicType || "STANDARD";
        updateData.postActionButton = postActionButton || "NO_ACTION";
        updateData.postActionLink = postActionLink || "";
        updateData.postCallPhone = postCallPhone || "";
        updateData.postCallToAction = postCallToAction || "";

        // Handle image upload
        if (postImage && postImage.size > 0) {
          const uploaded = await uploadToImageKit(postImage, `post_${Date.now()}_${postImage.name}`);
          updateData.postImageUrl = uploaded.url;
          updateData.postImageFileId = uploaded.fileId;
          uploadedFiles.push(uploaded.fileId);
        } else if (postImageUrl) {
          try {
            new URL(postImageUrl);
            updateData.postImageUrl = postImageUrl.trim();
          } catch {
            return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
          }
        }

        break;
      }


      case "manual_verification": {
        updateData.verified = true;
        break;
      }

      case "appointment": {
        const appointment = formData.get("appointment") as string;

        if (!appointment) {
          return NextResponse.json({ error: "Appointment link is required" }, { status: 400 });
        }

        try {
          const url = new URL(appointment);
          if (!/^https?:\/\//.test(url.href)) {
            return NextResponse.json({ error: "Appointment link must be a valid URL" }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: "Invalid appointment URL format" }, { status: 400 });
        }

        updateData.appointment = appointment.trim();
        break;
      }

      case "chat": {
        const chatType = formData.get("chatType") as string;
        const chatValue = formData.get("chatValue") as string;

        if (!chatType || !chatValue) {
          return NextResponse.json({
            error: "Chat type and value are required"
          }, { status: 400 });
        }

        if (chatType !== "whatsapp" && chatType !== "sms") {
          return NextResponse.json({
            error: "Chat type must be 'whatsapp' or 'sms'"
          }, { status: 400 });
        }

        if (chatType === "whatsapp") {
          if (!chatValue.startsWith("https://wa.me/")) {
            return NextResponse.json({
              error: "WhatsApp URL must start with https://wa.me/"
            }, { status: 400 });
          }
        } else if (chatType === "sms") {
          if (!/^\+?[\d]{10,}$/.test(chatValue.replace(/[\s\-()]/g, ""))) {
            return NextResponse.json({
              error: "Invalid phone number format for SMS"
            }, { status: 400 });
          }
        }

        updateData.chatType = chatType;
        updateData.chatValue = chatValue.trim();
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // If editableViaAPI is true, update GMB
    let gmbUpdateNote = "";
    if (task.editableViaAPI && actionType !== "manual_verification") {
      try {
        if (!accessToken || !gmbAccountId) {
          for (const fileId of uploadedFiles) {
            await deleteFromImageKit(fileId);
          }
          return NextResponse.json({ error: "GMB account not connected" }, { status: 400 });
        }

        await updateGMBLocation(
          actionType,
          updateData,
          gmbAccountId,
          task.locationId,
          accessToken
        );

        console.log('GMB update successful');
      } catch (gmbError: any) {
        console.error("GMB update error:", gmbError);
        for (const fileId of uploadedFiles) {
          await deleteFromImageKit(fileId);
        }
        return NextResponse.json(
          { error: "Failed to update GMB location", details: gmbError.message },
          { status: 500 }
        );
      }
    } else if (!task.editableViaAPI && uploadedFiles.length > 0) {
      updateData.uploadedFileIds = uploadedFiles;
    }

    // Task update successful, now complete the task
    const completedAt = new Date();
    const currentWeek = getWeekNumber(completedAt);
    const currentMonth = getMonthKey(completedAt);

    await prisma.completedTask.create({
      data: {
        userId: task.userId,
        locationId: task.locationId,
        placeId: task.placeId,
        title: task.title,
        description: task.description,
        category: task.category,
        type: task.type,
        priority: task.priority,
        impact: task.impact,
        points: task.points,
        repeatable: task.repeatable,
        estimatedTime: task.estimatedTime,
        week: currentWeek.toString(),
        month: currentMonth,
        completedAt,
        repeatFrequency: task.repeatFrequency || null,
        businessType: task.businessType || "all",
        actionType: actionType,
        editableViaAPI: task.editableViaAPI,
        verificationType: task.verificationType || "auto",
        caution: task.caution || null,
        verificationConfidence: null,
        verificationReason: null,
        pointsAwarded: task.points,
        pointsPenalty: null,
        verifiedAt: task.editableViaAPI ? completedAt : null,
      },
    });

    const locationProgress = await prisma.locationProgress.findUnique({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId: task.locationId,
        },
      },
    });

    if (!locationProgress) {
      return NextResponse.json({ error: "Location progress not found" }, { status: 404 });
    }

    const { currentStreak } = await calculateStreak(user.id, task.locationId);
    const newTotalPoints = locationProgress.totalPoints + task.points;
    const newLevel = calculateLevel(newTotalPoints);
    const newLongestStreak = Math.max(locationProgress.longestStreak, currentStreak);

    let profileScoreIncrement = 0;
    let engagementScoreIncrement = 0;
    let contentScoreIncrement = 0;

    if (task.category === "basic_info" || task.type === "profile") {
      profileScoreIncrement = Math.min(task.points, 20);
    } else if (task.category === "engagement" || task.type === "reviews") {
      engagementScoreIncrement = Math.min(task.points, 20);
    } else if (task.category === "visual" || task.type === "photos") {
      contentScoreIncrement = Math.min(task.points, 20);
    }

    const updatedProgress = await prisma.locationProgress.update({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId: task.locationId,
        },
      },
      data: {
        totalPoints: newTotalPoints,
        weeklyPoints: { increment: task.points },
        monthlyPoints: { increment: task.points },
        tasksCompleted: { increment: 1 },
        profileScore: { increment: profileScoreIncrement },
        engagementScore: { increment: engagementScoreIncrement },
        contentScore: { increment: contentScoreIncrement },
        lastActiveDate: completedAt,
        currentStreak: currentStreak,
        longestStreak: newLongestStreak,
        level: newLevel,
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "completed" },
    });

    await prisma.userProgress.update({
      where: { userId: user.id },
      data: {
        totalPoints: { increment: task.points },
        tasksCompleted: { increment: 1 },
        currentLevel: calculateLevel(newTotalPoints),
      },
    });

    const newMilestones = await checkMilestones(user.id, task.locationId, updatedProgress);
    const newAchievements = [];

    if (updatedProgress.tasksCompleted === 1) {
      const firstTask = await awardAchievement(user.id, task.locationId, "first_task");
      if (firstTask) newAchievements.push(firstTask);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksToday = await prisma.completedTask.count({
      where: {
        userId: user.id,
        locationId: task.locationId,
        completedAt: { gte: today, lt: tomorrow },
      },
    });

    if (tasksToday >= 5) {
      const speedDemon = await awardAchievement(user.id, task.locationId, "speed_demon");
      if (speedDemon) newAchievements.push(speedDemon);
    }

    const leveledUp = newLevel > locationProgress.level;

    if (task.editableViaAPI && actionType !== "manual_verification") {
      const updateNotes: Record<string, string> = {
        "website": "Website update sent to Google. Changes typically appear within 15 minutes to 24 hours on your Business Profile.",
        "phone": "Phone number update sent to Google. Changes typically appear within 15 minutes to 24 hours on your Business Profile.",
        "description": "Business description sent to Google for review. Updates may take 3-7 days to appear as they require manual approval.",
        "hours": "Business hours update sent to Google. Changes typically appear within 15 minutes to 24 hours on your Business Profile.",
        "services": "Services update sent to Google. Changes typically appear within 1-3 days on your Business Profile.",
        "photo": `${updateData.photos?.length || 1} photo(s) uploaded successfully. New photos typically appear within 1-3 days after Google's review.`,
        "video": "Video uploaded successfully. New videos typically appear within 1-3 days after Google's review.",
        "post": "Post published successfully. New posts typically appear within 15 minutes to 1 hour on your Business Profile.",
        "reviewsReply": "Review reply sent successfully. Your response typically appears within 15 minutes on Google.",
        "socialLinks": "Social links update sent to Google. Changes typically appear within 15 minutes to 24 hours on your Business Profile.",
        "attributes": "Business attributes update sent to Google. Changes typically appear within 1-3 days on your Business Profile.",
      };

      gmbUpdateNote = updateNotes[actionType] || "Update sent to Google successfully. Changes may take some time to appear on your Business Profile.";
    }

    return NextResponse.json({
      message: "Task completed successfully",
      actionType: actionType,
      updatedFields: Object.keys(updateData),
      pointsAwarded: task.points,
      newLevel: newLevel,
      leveledUp: leveledUp,
      newStreak: currentStreak,
      newTotalPoints: newTotalPoints,
      newMilestones: newMilestones,
      newAchievements: newAchievements,
      gmbUpdated: task.editableViaAPI && actionType !== "manual_verification",
      gmbUpdateNote: gmbUpdateNote
    });

  } catch (error: any) {
    console.error("Task completion error:", error);

    // Cleanup uploaded files on any error
    for (const fileId of uploadedFiles) {
      await deleteFromImageKit(fileId);
    }

    return NextResponse.json({
      error: "Failed to complete task",
      details: error.message
    }, { status: 500 });
  }
}
