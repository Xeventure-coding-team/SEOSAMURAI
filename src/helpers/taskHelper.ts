import { LocationProgress, Task } from "@/generated/prisma";

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  repeatable: boolean;
  estimated_time: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  points: number;
  prerequisites?: string[]
  seasonalRelevance?: string[]
  actionType?: string
  businessType?: string
  editableViaAPI?: boolean
  verificationType?: string
  caution?: string
  repeatFrequency?: string
  estimatedTime?: string
}

interface LocationData {
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: any[];
  reviews?: any[];
  opening_hours?: any;
  website?: string;
  business_status?: string;
  types?: string[];
  price_level?: number;
}

interface LocationAnalysis {
  criticalIssues: string[];
  strengths: string[];
  opportunities: string[];
  recommendedFocus: string[];
  scores: {
    profileCompleteness: number;
    reputationHealth: number;
    visualAppeal: number;
    engagementLevel: number;
  };
}

interface AssignmentContext {
  locationData: LocationData;
  locationAnalysis?: LocationAnalysis;
  existingTasks: Task[];
  locationProgress?: LocationProgress;
  currentWeek: string;
}

/**
 * Analyzes location data to identify key areas for improvement
 */
export function analyzeLocation(locationData: LocationData): LocationAnalysis {
  const criticalIssues: string[] = [];
  const strengths: string[] = [];
  const opportunities: string[] = [];
  const recommendedFocus: string[] = [];

  // Profile completeness score (0-100)
  let profileCompleteness = 0;
  if (locationData.name) profileCompleteness += 20;
  if (locationData.formatted_address) profileCompleteness += 15;
  if (locationData.opening_hours) profileCompleteness += 25;
  else criticalIssues.push("Missing business hours");
  if (locationData.website) profileCompleteness += 20;
  else opportunities.push("Add website URL");
  if (locationData.photos && locationData.photos.length > 0) profileCompleteness += 20;

  // Reputation health score (0-100)
  const rating = locationData.rating || 0;
  const reviewCount = locationData.user_ratings_total || 0;
  let reputationHealth = 0;

  if (rating >= 4.5) {
    reputationHealth = 100;
    strengths.push(`Excellent rating: ${rating}/5`);
  } else if (rating >= 4.0) {
    reputationHealth = 75;
    strengths.push(`Good rating: ${rating}/5`);
  } else if (rating >= 3.5) {
    reputationHealth = 50;
    opportunities.push("Improve rating through better service");
  } else if (rating > 0) {
    reputationHealth = 25;
    criticalIssues.push(`Low rating: ${rating}/5 - needs immediate attention`);
    recommendedFocus.push("reviews");
  }

  if (reviewCount < 5) {
    criticalIssues.push("Very few reviews - needs review generation");
    recommendedFocus.push("reviews");
  } else if (reviewCount < 20) {
    opportunities.push("Build review base for more credibility");
    recommendedFocus.push("reviews");
  } else {
    strengths.push(`${reviewCount} reviews`);
  }

  // Visual appeal score (0-100)
  const photoCount = locationData.photos?.length || 0;
  let visualAppeal = 0;

  if (photoCount === 0) {
    visualAppeal = 0;
    criticalIssues.push("No photos - severely limits customer engagement");
    recommendedFocus.push("photos");
  } else if (photoCount < 5) {
    visualAppeal = 30;
    opportunities.push("Add more photos to showcase your business");
    recommendedFocus.push("photos");
  } else if (photoCount < 10) {
    visualAppeal = 60;
    opportunities.push("Add variety of photos (interior, products, team)");
  } else {
    visualAppeal = 100;
    strengths.push(`${photoCount} photos uploaded`);
  }

  // Engagement level score (0-100)
  let engagementLevel = 50; // Default medium engagement

  if (reviewCount > 50 && rating >= 4.0) {
    engagementLevel = 90;
    strengths.push("High customer engagement");
  } else if (reviewCount > 20) {
    engagementLevel = 70;
  } else if (reviewCount < 10) {
    engagementLevel = 30;
    opportunities.push("Increase engagement through posts and updates");
    recommendedFocus.push("posts");
  }

  // Determine overall recommended focus areas
  if (profileCompleteness < 70) {
    recommendedFocus.push("basic_info");
  }
  if (visualAppeal < 60) {
    recommendedFocus.push("visual");
  }
  if (reputationHealth < 70) {
    recommendedFocus.push("engagement");
  }

  return {
    criticalIssues,
    strengths,
    opportunities,
    recommendedFocus,
    scores: {
      profileCompleteness,
      reputationHealth,
      visualAppeal,
      engagementLevel
    }
  };
}

/**
 * Analyzes location needs and scores each task template based on location data
 */
function scoreTaskForLocation(
  task: TaskTemplate,
  context: AssignmentContext
): number {
  let score = 0;
  const { locationData, locationAnalysis, locationProgress } = context;

  // Base priority scoring
  const priorityScores = { high: 30, medium: 20, low: 10 };
  score += priorityScores[task.priority];

  // Base impact scoring
  const impactScores = { high: 25, medium: 15, low: 5 };
  score += impactScores[task.impact];

  // Points value scoring
  score += task.points;

  // 🎯 Location analysis-based scoring
  if (locationAnalysis) {
    const { scores, recommendedFocus, criticalIssues } = locationAnalysis;

    // Critical issues get highest priority
    if (criticalIssues.some(issue => issue.toLowerCase().includes('hours')) &&
      task.id === 'task_001') {
      score += 100; // Missing hours is critical
    }

    if (criticalIssues.some(issue => issue.toLowerCase().includes('photo')) &&
      task.type === 'photos') {
      score += 90; // No photos is critical
    }

    if (criticalIssues.some(issue => issue.toLowerCase().includes('review')) &&
      task.type === 'reviews') {
      score += 85; // Review issues are critical
    }

    // Boost tasks in recommended focus areas
    if (recommendedFocus.includes(task.category)) {
      score += 50;
    }

    if (recommendedFocus.includes(task.type)) {
      score += 45;
    }

    // Score adjustments based on specific metrics
    if (scores.profileCompleteness < 50 && task.category === 'basic_info') {
      score += 60;
    }

    if (scores.reputationHealth < 50 && task.type === 'reviews') {
      score += 70;
    }

    if (scores.visualAppeal < 40 && task.type === 'photos') {
      score += 65;
    }

    if (scores.engagementLevel < 50 && task.type === 'posts') {
      score += 55;
    }
  }

  // Detailed location data scoring
  if (locationData) {
    const rating = locationData.rating || 0;
    const reviewCount = locationData.user_ratings_total || 0;
    const photoCount = locationData.photos?.length || 0;

    // Profile completion tasks
    if (task.category === 'basic_info') {
      if (!locationData.opening_hours && task.id === 'task_001') {
        score += 80;
      }
      if (!locationData.website && task.id === 'task_005') {
        score += 60;
      }
    }

    // Review management - sophisticated scoring
    if (task.type === 'reviews') {
      if (rating < 3.5 && task.id === 'task_010') {
        score += 90; // Critical: respond to negative reviews
      } else if (rating < 4.0 && (task.id === 'task_008' || task.id === 'task_009')) {
        score += 70; // Important: improve review responses
      }

      if (reviewCount < 5 && (task.id === 'task_011' || task.id === 'task_012')) {
        score += 85; // Critical: build review base
      } else if (reviewCount < 20 && task.id === 'task_011') {
        score += 60; // Important: continue building reviews
      }

      if (reviewCount > 10 && rating >= 4.0 && task.id === 'task_008') {
        score += 50; // Maintain good momentum
      }
    }

    // Photo tasks - detailed scoring
    if (task.type === 'photos') {
      if (photoCount === 0) {
        score += 95; // Critical priority
      } else if (photoCount < 5) {
        score += 70; // High priority
      } else if (photoCount < 10) {
        score += 40; // Medium priority
      } else {
        score += 20; // Maintenance
      }

      // Specific photo types based on business
      if (task.id === 'task_015' && photoCount < 3) {
        score += 30; // Interior photos
      }
      if (task.id === 'task_016' && reviewCount > 0) {
        score += 25; // Team photos for established businesses
      }
    }

    // Post tasks - engagement boosters
    if (task.type === 'posts') {
      if (reviewCount < 20) {
        score += 45; // Need more engagement
      }

      if (task.id === 'task_020') {
        score += 35; // Promotions drive action
      }

      if (task.id === 'task_019' && rating >= 4.0) {
        score += 30; // Showcase achievements
      }
    }

    // Business type specific scoring
    if (locationData.types) {
      const isRestaurant = locationData.types.some(t =>
        ['restaurant', 'food', 'cafe', 'bar'].includes(t.toLowerCase())
      );
      const isRetail = locationData.types.some(t =>
        ['store', 'shop', 'shopping'].includes(t.toLowerCase())
      );

      if (isRestaurant && task.id === 'task_017') {
        score += 40; // Menu/product photos crucial
      }

      if (isRetail && task.id === 'task_020') {
        score += 35; // Promotions important for retail
      }
    }
  }

  // Location progress-based adjustments
  if (locationProgress) {
    if (task.type === 'profile' && locationProgress.profileScore < 40) {
      score += 50;
    }

    if (task.category === 'engagement' && locationProgress.engagementScore < 40) {
      score += 45;
    }

    if (task.category === 'visual' && locationProgress.contentScore < 40) {
      score += 45;
    }
  }

  return score;
}

/**
 * Ensures diversity in task categories while prioritizing critical needs
 */
function balanceTaskCategories(tasks: TaskTemplate[], analysis?: LocationAnalysis): TaskTemplate[] {
  const categoryCount: Map<string, number> = new Map();
  const typeCount: Map<string, number> = new Map();
  const balanced: TaskTemplate[] = [];

  // Priority tiers based on analysis
  const criticalTasks = analysis?.criticalIssues.length ?? 0 > 0
    ? tasks.slice(0, Math.min(3, tasks.length))
    : [];

  // Add critical tasks first
  for (const task of criticalTasks) {
    if (balanced.length >= 10) break;
    balanced.push(task);
    categoryCount.set(task.category, (categoryCount.get(task.category) || 0) + 1);
    typeCount.set(task.type, (typeCount.get(task.type) || 0) + 1);
  }

  // Fill remaining slots with balanced selection
  for (const task of tasks) {
    if (balanced.length >= 10) break;
    if (balanced.includes(task)) continue;

    const catCount = categoryCount.get(task.category) || 0;
    const typCount = typeCount.get(task.type) || 0;

    // Ensure diversity (max 4 per category, max 4 per type)
    if (catCount < 4 && typCount < 4) {
      balanced.push(task);
      categoryCount.set(task.category, catCount + 1);
      typeCount.set(task.type, typCount + 1);
    }
  }

  // If we still need more tasks, add highest scored remaining
  for (const task of tasks) {
    if (balanced.length >= 10) break;
    if (!balanced.includes(task)) {
      balanced.push(task);
    }
  }

  return balanced.slice(0, 10);
}

/**
 * Main function to select 10 tasks for a location based on comprehensive analysis
 */
export function selectTasksForLocation(
  allTasks: TaskTemplate[],
  context: AssignmentContext
): TaskTemplate[] {
  const { existingTasks, locationData } = context;

  // Ensure we have location data
  if (!locationData) {
    throw new Error("Location data is required for task selection");
  }

  // Get IDs of existing tasks
  const existingTaskTitles = new Set(
    existingTasks
      .filter(t => t.status !== 'completed')
      .map(t => t.title)
  );

  // Filter available tasks
  const availableTasks = allTasks.filter(task => {
    return task.repeatable || !existingTaskTitles.has(task.title);
  });

  if (availableTasks.length === 0) {
    return [];
  }

  // Score each task based on location analysis
  const scoredTasks = availableTasks.map(task => ({
    task,
    score: scoreTaskForLocation(task, context)
  }));

  // Sort by score (highest first)
  scoredTasks.sort((a, b) => b.score - a.score);

  // Extract sorted tasks
  const sortedTasks = scoredTasks.map(st => st.task);

  // Balance categories while maintaining priority
  return balanceTaskCategories(sortedTasks, context.locationAnalysis);
}

/**
 * Prioritize tasks based on urgency, business needs, and location analysis
 */
export function prioritizeTaskOrder(
  tasks: TaskTemplate[],
  analysis?: LocationAnalysis
): TaskTemplate[] {
  // Create priority groups
  const critical: TaskTemplate[] = [];
  const high: TaskTemplate[] = [];
  const medium: TaskTemplate[] = [];
  const low: TaskTemplate[] = [];

  for (const task of tasks) {
    // Check if task addresses critical issues
    const isCritical = analysis?.criticalIssues.some(issue => {
      const issueLower = issue.toLowerCase();
      return (
        (issueLower.includes('hours') && task.id === 'task_001') ||
        (issueLower.includes('photo') && task.type === 'photos') ||
        (issueLower.includes('review') && task.type === 'reviews' && task.priority === 'high')
      );
    }) || false;

    if (isCritical) {
      critical.push(task);
    } else if (task.priority === 'high') {
      high.push(task);
    } else if (task.priority === 'medium') {
      medium.push(task);
    } else {
      low.push(task);
    }
  }

  // Sort within each group by impact then points
  const sortByImpact = (a: TaskTemplate, b: TaskTemplate) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
    if (impactDiff !== 0) return impactDiff;
    return b.points - a.points;
  };

  critical.sort(sortByImpact);
  high.sort(sortByImpact);
  medium.sort(sortByImpact);
  low.sort(sortByImpact);

  return [...critical, ...high, ...medium, ...low];
}

/**
 * Get task recommendations with detailed reasons based on location analysis
 */
export function getTaskRecommendations(
  tasks: TaskTemplate[],
  context: AssignmentContext
): Array<{ task: TaskTemplate; reason: string; urgency: 'critical' | 'important' | 'recommended' }> {
  const { locationData, locationAnalysis, locationProgress } = context;
  const recommendations: Array<{
    task: TaskTemplate;
    reason: string;
    urgency: 'critical' | 'important' | 'recommended'
  }> = [];

  for (const task of tasks) {
    let reason = '';
    let urgency: 'critical' | 'important' | 'recommended' = 'recommended';

    // Check if task addresses critical issues
    const criticalIssue = locationAnalysis?.criticalIssues.find(issue => {
      const issueLower = issue.toLowerCase();
      return (
        (issueLower.includes('hours') && task.id === 'task_001') ||
        (issueLower.includes('photo') && task.type === 'photos') ||
        (issueLower.includes('review') && task.type === 'reviews')
      );
    });

    if (criticalIssue) {
      reason = `CRITICAL: ${criticalIssue}`;
      urgency = 'critical';
    } else {
      // Generate specific reasons based on task type and location data
      const rating = locationData?.rating || 0;
      const reviewCount = locationData?.user_ratings_total || 0;
      const photoCount = locationData?.photos?.length || 0;

      // Profile completeness
      if (task.category === 'basic_info') {
        if (!locationData?.opening_hours && task.id === 'task_001') {
          reason = '78% of customers check hours before visiting - this is essential';
          urgency = 'critical';
        } else if (!locationData?.website && task.id === 'task_005') {
          reason = 'Businesses with websites get 70% more clicks';
          urgency = 'important';
        } else if (task.id === 'task_002') {
          reason = 'Complete category information improves search visibility by 40%';
          urgency = 'important';
        } else if (task.id === 'task_003') {
          reason = 'Accurate business description helps customers understand your services';
          urgency = 'recommended';
        } else {
          reason = 'Complete profile information builds customer trust';
          urgency = 'recommended';
        }
      }

      // Review management
      else if (task.type === 'reviews') {
        if (rating < 3.5 && task.id === 'task_010') {
          reason = `Low rating (${rating}/5) detected - addressing negative feedback is critical for reputation`;
          urgency = 'critical';
        } else if (reviewCount < 5 && (task.id === 'task_011' || task.id === 'task_012')) {
          reason = 'Businesses with 5+ reviews get 3x more clicks - build your review base';
          urgency = 'critical';
        } else if (rating < 4.0 && task.id === 'task_008') {
          reason = `Rating of ${rating}/5 needs attention - respond to reviews to improve perception`;
          urgency = 'important';
        } else if (reviewCount < 20 && task.id === 'task_011') {
          reason = 'Increase review count to build credibility and social proof';
          urgency = 'important';
        } else if (task.id === 'task_008') {
          reason = 'Responding to reviews increases customer retention by 33%';
          urgency = 'important';
        } else if (task.id === 'task_009') {
          reason = 'Thanking reviewers encourages more positive feedback';
          urgency = 'recommended';
        } else {
          reason = 'Active review management shows customers you care';
          urgency = 'recommended';
        }
      }

      // Photo tasks
      else if (task.type === 'photos') {
        if (photoCount === 0) {
          reason = 'Listings with photos get 42% more direction requests - add photos immediately';
          urgency = 'critical';
        } else if (photoCount < 5) {
          reason = `Only ${photoCount} photos - businesses with 10+ photos get 2x more engagement`;
          urgency = 'important';
        } else if (photoCount < 10) {
          reason = 'Add variety of photos to showcase different aspects of your business';
          urgency = 'important';
        } else if (task.id === 'task_015') {
          reason = 'Interior photos help customers feel comfortable visiting';
          urgency = 'recommended';
        } else if (task.id === 'task_017') {
          reason = 'Product photos drive purchasing decisions';
          urgency = 'recommended';
        } else {
          reason = 'Fresh photos keep your profile engaging and up-to-date';
          urgency = 'recommended';
        }
      }

      // Post tasks
      else if (task.type === 'posts') {
        if (reviewCount < 20 && task.id === 'task_019') {
          reason = 'Regular posts can boost engagement by 50% for new businesses';
          urgency = 'important';
        } else if (task.id === 'task_020') {
          reason = 'Promotions drive immediate customer action and foot traffic';
          urgency = 'important';
        } else if (task.id === 'task_021') {
          reason = 'Event posts get 3x more engagement than regular updates';
          urgency = 'important';
        } else if (task.id === 'task_019') {
          reason = 'Weekly updates keep customers informed and engaged';
          urgency = 'recommended';
        } else {
          reason = 'Regular posts improve visibility in local search';
          urgency = 'recommended';
        }
      }

      // Q&A tasks
      else if (task.type === 'questions') {
        reason = 'Answering questions reduces customer support calls by 25%';
        urgency = 'recommended';
      }

      // Insights tasks
      else if (task.type === 'insights') {
        if (task.id === 'task_024') {
          reason = 'Understanding performance metrics helps optimize your strategy';
          urgency = 'recommended';
        } else {
          reason = 'Data-driven decisions improve ROI by 40%';
          urgency = 'recommended';
        }
      }

      // Attributes and amenities
      else if (task.category === 'attributes') {
        reason = 'Detailed attributes help customers find exactly what they need';
        urgency = 'recommended';
      }

      // Default reasoning
      else {
        reason = `${task.impact.charAt(0).toUpperCase() + task.impact.slice(1)} impact task worth ${task.points} points`;
        urgency = 'recommended';
      }
    }

    // Adjust urgency based on location analysis scores
    if (locationAnalysis) {
      const { scores } = locationAnalysis;

      if (task.category === 'basic_info' && scores.profileCompleteness < 40) {
        urgency = urgency === 'recommended' ? 'important' : urgency;
      }

      if (task.type === 'reviews' && scores.reputationHealth < 40) {
        urgency = urgency === 'recommended' ? 'important' : urgency;
      }

      if (task.type === 'photos' && scores.visualAppeal < 30) {
        urgency = urgency === 'recommended' ? 'important' : urgency;
      }

      if (task.type === 'posts' && scores.engagementLevel < 40) {
        urgency = urgency === 'recommended' ? 'important' : urgency;
      }
    }

    // Location progress scoring adjustments
    if (locationProgress) {
      if (task.type === 'profile' && locationProgress.profileScore < 30) {
        urgency = 'critical';
        reason = `Profile score is very low (${locationProgress.profileScore}/100) - ${reason}`;
      }
      if (task.category === 'engagement' && locationProgress.engagementScore < 30) {
        urgency = urgency === 'recommended' ? 'important' : urgency;
      }
    }

    recommendations.push({ task, reason, urgency });
  }

  // Sort by urgency
  const urgencyOrder = { critical: 1, important: 2, recommended: 3 };
  recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return recommendations;
}

/**
 * Calculate estimated completion time for all tasks
 */
export function calculateTotalTime(tasks: TaskTemplate[]): string {
  let totalMinutes = 0;

  for (const task of tasks) {
    const match = task.estimated_time.match(/(\d+)/);
    if (match) {
      totalMinutes += parseInt(match[1]);
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get quick wins (high impact, low effort tasks)
 */
export function getQuickWins(tasks: TaskTemplate[]): TaskTemplate[] {
  return tasks.filter(task => {
    const timeMatch = task.estimated_time.match(/(\d+)/);
    const minutes = timeMatch ? parseInt(timeMatch[1]) : 999;

    return task.impact === 'high' && minutes <= 15;
  }).slice(0, 3);
}

/**
 * Validate task assignment constraints
 */
export function validateTaskAssignment(
  selectedTasks: TaskTemplate[],
  existingTasks: Task[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicates of non-repeatable tasks
  const existingTitles = new Set(
    existingTasks
      .filter(t => t.status !== 'completed')
      .map(t => t.title)
  );

  for (const task of selectedTasks) {
    if (!task.repeatable && existingTitles.has(task.title)) {
      errors.push(`Task "${task.title}" is already assigned and not repeatable`);
    }
  }

  // Ensure we have 10 tasks or explain why not
  if (selectedTasks.length < 10) {
    errors.push(`Only ${selectedTasks.length} tasks selected (target: 10)`);
  }

  // Check category distribution (max 4 tasks per category for balance)
  const categoryCount: Record<string, number> = {};
  for (const task of selectedTasks) {
    categoryCount[task.category] = (categoryCount[task.category] || 0) + 1;
  }

  for (const [category, count] of Object.entries(categoryCount)) {
    if (count > 4) {
      errors.push(`Too many tasks (${count}) from category "${category}", max 4 recommended for diversity`);
    }
  }

  // Check type distribution
  const typeCount: Record<string, number> = {};
  for (const task of selectedTasks) {
    typeCount[task.type] = (typeCount[task.type] || 0) + 1;
  }

  for (const [type, count] of Object.entries(typeCount)) {
    if (count > 4) {
      errors.push(`Too many tasks (${count}) of type "${type}", consider more variety`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate comprehensive task assignment summary
 */
export function generateAssignmentSummary(tasks: TaskTemplate[]): {
  totalPoints: number;
  estimatedTime: string;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  byImpact: Record<string, number>;
  quickWins: number;
} {
  const summary = {
    totalPoints: tasks.reduce((sum, t) => sum + t.points, 0),
    estimatedTime: calculateTotalTime(tasks),
    byPriority: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    byImpact: {} as Record<string, number>,
    quickWins: getQuickWins(tasks).length
  };

  for (const task of tasks) {
    summary.byPriority[task.priority] = (summary.byPriority[task.priority] || 0) + 1;
    summary.byCategory[task.category] = (summary.byCategory[task.category] || 0) + 1;
    summary.byType[task.type] = (summary.byType[task.type] || 0) + 1;
    summary.byImpact[task.impact] = (summary.byImpact[task.impact] || 0) + 1;
  }

  return summary;
}