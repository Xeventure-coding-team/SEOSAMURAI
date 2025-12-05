'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Sparkles,
  MapPin,
  Megaphone,
  Calendar,
  ScanSearch,
  Star,
  QrCode,
  BellRing,
  HelpCircle,
  Bot,
  X,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

const TOOLS = {
  locations: { title: 'Locations', icon: MapPin, desc: 'Manage all your Google Business Profiles in one place.' },
  'bulk-posting': { title: 'Bulk Posting', icon: Megaphone, desc: 'Post to hundreds of locations instantly.' },
  'schedule-posting': { title: 'Schedule Posting', icon: Calendar, desc: 'Schedule posts for later — perfect for campaigns.' },
  'run-scan': { title: 'Run a Scan', icon: ScanSearch, desc: 'Track your exact Google Maps ranking across a real search grid.' },
  reviews: { title: 'Reviews', icon: Star, desc: 'View, reply, and manage customer reviews across all locations.' },
  'review-poster': {
    title: 'Review Poster',
    icon: QrCode,
    desc: 'Create beautiful QR code posters to get more 5-star Google reviews fast.',
  },
  'tracked-reviews': {
    title: 'Tracked Reviews',
    icon: BellRing,
    desc: 'Detect and permanently save deleted reviews — never lose proof again.',
  },
  // chat: {
  //   title: 'Help Chat',
  //   icon: MessageCircle,
  //   desc: "You're here! Ask anything about the app.", // Fixed: proper closing quote
  // },
};

const LOCATIONS_SUGGESTIONS = [
  "What is the Locations page and why is it important?",
  "How do I add a new Google Business location?",
  "Why can't I see some locations? (Permissions, sync issues)",
  "What does 'Add New Location' do?",
  "How do I remove a location permanently? (Danger Zone)",
  "How do I search/filter locations? (Name, Category, etc.)",
  "Why do some locations show 'No website' or 'Uncategorized'?",
  "What is 'View Details' and 'Manage Location'?",
  "How do I access posts/reviews from a location?",
  "What is Manage Location page? (Tasks, Keywords, etc.)",
];

const BULK_POSTING_SUGGESTIONS = [
  "What is Bulk Posting and who is it for?",
  "How do I post the same content to multiple locations at once?",
  "Can I select ALL my locations with one click?",
  "What types of posts can I send in bulk? (Photo, Offer, Event, Update)",
  "Is there a limit to how many locations I can post to at once?",
  "How long does it take to post to 100+ locations?",
  "Will bulk posts appear instantly on Google?",
  "Do bulk posts count as spam or hurt my ranking?",
  "Can I schedule bulk posts for later? (Combine with Schedule Posting)",
];

const SCHEDULE_POSTING_SUGGESTIONS = [
  "What is Schedule Posting and why should I use it?",
  "How do I schedule a post for a future date and time?",
  "Can I schedule the same post to multiple locations at once?",
  "What types of posts can I schedule? (Photo, Offer, Event, Update)",
  "Will my scheduled posts appear on Google automatically?",
  "Can I edit or delete a post after I’ve scheduled it?",
  "Do scheduled posts affect my Google ranking?",
  "What’s the best time and day to post on Google Business?",
  "Can I see all my upcoming scheduled posts in a calendar?",
  "Is there a limit to how many posts I can schedule?",
  "What happens if I lose internet — will my scheduled post still go live?",
];

const RUN_SCAN_SUGGESTIONS = [
  "What is 'Run a Scan' and why should I use it?",
  "What does 'Visibility Percentage' mean?",
  "How accurate are these rankings compared to real Google search?",
  "Should I scan with one keyword or multiple?",
  "What’s the difference between grid size and distance?",
  "Why does my business sometimes not appear in some grid points?",
  "How often should I run a scan for best results?",
  "Does a higher 'Average Rank' mean I'm doing well?",
  "Can I track my competitors using this tool?",
  "What should I do if my ranking is dropping?",
  "Will running more scans improve my actual Google ranking?",
];

const REVIEWS_SUGGESTIONS = [
  "How do I reply to a Google review?",
  "How does the AI Generate Reply button work?",
  "Can I edit or delete a reply after posting it?",
  "What happens when I click 'Yes' on 'Do you think this review is incorrect'?",
  "Why should I reply to every review — even 5-star ones?",
  "How do I know which reviews still need a reply?",
  "Will the AI reply sound natural and personalized?",
  "Can I customize the AI reply before posting?",
  "Does replying to reviews improve my Google ranking?",
  "Where can I see all my reviews in one place?",
];

const REVIEW_POSTER_SUGGESTIONS = [
  "What is the Review Poster and how does it work?",
  "How do I create my first review poster?",
  "Can I auto-fill the review link from my Google locations?",
  "What are background patterns and which one looks best?",
  "What should I put in the 'Keywords / Review Hints' section?",
  "How do customers actually leave a review using the poster?",
  "How do I edit or delete a poster I’ve already created?",
];

export default function HelpDeskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showInitialChoices, setShowInitialChoices] = useState(true);

  const [inLocationsFlow, setInLocationsFlow] = useState(false);
  const [inBulkPostingFlow, setInBulkPostingFlow] = useState(false);
  const [inSchedulePostingFlow, setInSchedulePostingFlow] = useState(false);
  const [inRunScanFlow, setInRunScanFlow] = useState(false);
  const [inReviewsFlow, setInReviewsFlow] = useState(false);
  const [inReviewPosterFlow, setInReviewPosterFlow] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hi! I'm your AI assistant. How can I help you today?",
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendToAI = async (userMessage: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/help-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages }),
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (type: 'app' | 'tools') => {
    setShowInitialChoices(false);
    const userMessage = type === 'app' ? 'Tell me about this app' : 'Show me all tools';
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    if (type === 'tools') {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Here are all the powerful tools you have access to:' }]);
        setShowTools(true);
      }, 300);
    } else {
      await sendToAI(userMessage);
    }
  };

  const resetAllFlows = () => {
    setInLocationsFlow(false);
    setInBulkPostingFlow(false);
    setInSchedulePostingFlow(false);
    setInRunScanFlow(false);
    setInReviewsFlow(false);
    setInReviewPosterFlow(false);
  };

  const startLocationsFlow = () => { resetAllFlows(); setInLocationsFlow(true); setShowTools(false); setMessages(prev => [...prev, { role: 'user', content: 'Locations' }, { role: 'assistant', content: "The Locations page is your central dashboard to view, search, filter, and manage all connected Google Business Profiles. From here you can add new locations, view details, or jump to manage posts/reviews.\n\nHere are the most common questions:" }]); };
  const startBulkPostingFlow = () => { resetAllFlows(); setInBulkPostingFlow(true); setShowTools(false); setMessages(prev => [...prev, { role: 'user', content: 'Bulk Posting' }, { role: 'assistant', content: "Bulk Posting lets you publish the same post to hundreds of locations instantly — the ultimate time-saver for agencies and multi-location businesses.\n\nHere are the most common questions:" }]); };
  const startSchedulePostingFlow = () => { resetAllFlows(); setInSchedulePostingFlow(true); setShowTools(false); setMessages(prev => [...prev, { role: 'user', content: 'Schedule Posting' }, { role: 'assistant', content: "Schedule Posting lets you plan and automate your Google Business posts in advance — perfect for promotions, events, holidays, and consistent branding.\n\nYou can see all upcoming posts in a beautiful calendar view!\n\nHere are the most common questions:" }]); };
  const startRunScanFlow = () => { resetAllFlows(); setInRunScanFlow(true); setShowTools(false); setMessages(prev => [...prev, { role: 'user', content: 'Run a Scan' }, { role: 'assistant', content: "The 'Run a Scan' tool shows exactly where your business ranks on Google Maps for your target keywords — across a grid of real search locations around your store.\n\nIt’s one of the most powerful local SEO tools available.\n\nHere are the most common questions:" }]); };
  const startReviewsFlow = () => { resetAllFlows(); setInReviewsFlow(true); setShowTools(false); setMessages(prev => [...prev, { role: 'user', content: 'Reviews' }, { role: 'assistant', content: "The Reviews tool lets you view, reply, and manage all customer reviews across your locations in one place.\n\nHere are the most common questions:" }]); };
  const startReviewPosterFlow = () => { resetAllFlows(); setInReviewPosterFlow(true); setShowTools(false); setMessages(prev => [...prev, { role: 'user', content: 'Review Poster' }, { role: 'assistant', content: "The Review Poster lets you create stunning QR code posters that make it incredibly easy for customers to leave 5-star Google reviews!\n\nHere are the most common questions:" }]); };

  const handleTool = async (key: string) => {
    setShowTools(false);
    if (key === 'locations') return startLocationsFlow();
    if (key === 'bulk-posting') return startBulkPostingFlow();
    if (key === 'schedule-posting') return startSchedulePostingFlow();
    if (key === 'run-scan') return startRunScanFlow();
    if (key === 'reviews') return startReviewsFlow();
    if (key === 'review-poster') return startReviewPosterFlow();

    resetAllFlows();
    const tool = TOOLS[key as keyof typeof TOOLS];
    setMessages(prev => [...prev, { role: 'user', content: tool.title }]);
    await sendToAI(`Tell me about the ${tool.title} feature in detail`);
  };

  const handleSuggestionClick = (question: string) => {
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    sendToAI(question);
  };

  const showFollowUp = (topic: string) => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Happy to help! Do you have any other questions about ${topic}?`,
    }]);
  };

  const handleFollowUp = (choice: 'yes' | 'no', topic: string) => {
    if (choice === 'yes') {
      if (topic === 'Locations') startLocationsFlow();
      if (topic === 'Bulk Posting') startBulkPostingFlow();
      if (topic === 'Schedule Posting') startSchedulePostingFlow();
      if (topic === 'Run a Scan') startRunScanFlow();
      if (topic === 'Reviews') startReviewsFlow();
      if (topic === 'Review Poster') startReviewPosterFlow();
    } else {
      resetAllFlows();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Great! If you need help with anything else, just ask. Have a wonderful day!",
      }]);
    }
  };

  useEffect(() => {
    const inAnyFlow = inLocationsFlow || inBulkPostingFlow || inSchedulePostingFlow || inRunScanFlow || inReviewsFlow || inReviewPosterFlow;
    if (inAnyFlow && !loading && messages[messages.length - 1]?.role === 'assistant') {
      const lastAssistant = messages[messages.length - 1].content;
      const lastUser = messages[messages.length - 2]?.content;

      const suggestions = inLocationsFlow ? LOCATIONS_SUGGESTIONS
        : inBulkPostingFlow ? BULK_POSTING_SUGGESTIONS
        : inSchedulePostingFlow ? SCHEDULE_POSTING_SUGGESTIONS
        : inRunScanFlow ? RUN_SCAN_SUGGESTIONS
        : inReviewsFlow ? REVIEWS_SUGGESTIONS
        : inReviewPosterFlow ? REVIEW_POSTER_SUGGESTIONS
        : [];

      const topic = inLocationsFlow ? 'Locations'
        : inBulkPostingFlow ? 'Bulk Posting'
        : inSchedulePostingFlow ? 'Schedule Posting'
        : inRunScanFlow ? 'Run a Scan'
        : inReviewsFlow ? 'Reviews'
        : inReviewPosterFlow ? 'Review Poster'
        : '';

      if (lastUser && suggestions.includes(lastUser) && !lastAssistant.includes("Do you have any other questions")) {
        setTimeout(() => showFollowUp(topic), 1200);
      }
    }
  }, [messages, loading, inLocationsFlow, inBulkPostingFlow, inSchedulePostingFlow, inRunScanFlow, inReviewsFlow, inReviewPosterFlow]);

  // End Chat — No popup, instant clear
  const endChat = () => {
    const hasConversation = messages.length > 1 || !showInitialChoices;
    if (!hasConversation) return;

    setMessages([{
      role: 'assistant',
      content: "Hi! I'm your AI assistant. How can I help you today?",
    }]);
    setShowInitialChoices(true);
    setShowTools(false);
    resetAllFlows();
  };

  const hasConversation = messages.length > 1 || !showInitialChoices;

  const currentSuggestions = inLocationsFlow ? LOCATIONS_SUGGESTIONS
    : inBulkPostingFlow ? BULK_POSTING_SUGGESTIONS
    : inSchedulePostingFlow ? SCHEDULE_POSTING_SUGGESTIONS
    : inRunScanFlow ? RUN_SCAN_SUGGESTIONS
    : inReviewsFlow ? REVIEWS_SUGGESTIONS
    : inReviewPosterFlow ? REVIEW_POSTER_SUGGESTIONS
    : [];

  const currentTopic = inLocationsFlow ? 'Locations'
    : inBulkPostingFlow ? 'Bulk Posting'
    : inSchedulePostingFlow ? 'Schedule Posting'
    : inRunScanFlow ? 'Run a Scan'
    : inReviewsFlow ? 'Reviews'
    : inReviewPosterFlow ? 'Review Poster'
    : '';

  const inGuidedFlow = inLocationsFlow || inBulkPostingFlow || inSchedulePostingFlow || inRunScanFlow || inReviewsFlow || inReviewPosterFlow;

  return (
<div className="min-h-screen  text-gray-100 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-[#8c5cff]" />
          <div>
            <h1 className="font-semibold text-lg">Help & Support</h1>
            <p className="text-xs text-gray-500">Always here to guide you</p>
          </div>
        </div>
        <button
          onClick={endChat}
          disabled={!hasConversation}
          className={`p-2 rounded-lg transition ${hasConversation
            ? 'hover:bg-[#2a2c33] text-white'
            : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl px-5 py-3 rounded-2xl ${m.role === 'user'
              ? 'bg-[#8c5cff] text-white'
              : 'bg-[#2a2c33] border border-gray-800'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-5 py-3 rounded-2xl bg-[#2a2c33] border border-gray-800">
              <Loader2 className="w-5 h-5 animate-spin text-[#8c5cff]" />
            </div>
          </div>
        )}

        {/* Tool Cards */}
        {showTools && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {Object.entries(TOOLS).map(([key, tool]) => {
              const Icon = tool.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleTool(key)}
                  disabled={loading}
                  className="p-5 bg-[#2a2c33] border border-gray-800 rounded-xl hover:border-[#8c5cff] hover:bg-[#33353d] transition text-left disabled:opacity-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-[#33353d] rounded-lg">
                      <Icon className="w-6 h-6 text-[#8c5cff]" />
                    </div>
                    <div>
                      <h3 className="font-medium">{tool.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{tool.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Guided Suggestions */}
        {inGuidedFlow && messages[messages.length - 1]?.content.includes("most common questions") && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentSuggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(q)}
                  className="text-left p-4 bg-[#2a2c33] border border-gray-800 rounded-xl hover:border-[#8c5cff] hover:bg-[#33353d] transition text-sm text-gray-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Buttons */}
        {inGuidedFlow && messages[messages.length - 1]?.content.includes("Do you have any other questions") && (
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
            <button onClick={() => handleFollowUp('yes', currentTopic)} className="flex items-center justify-center gap-3 px-6 py-4 bg-[#8c5cff] hover:bg-[#7a4ee6] rounded-xl transition font-medium">
              <CheckCircle className="w-5 h-5" /> Yes, show me more
            </button>
            <button onClick={() => handleFollowUp('no', currentTopic)} className="flex items-center justify-center gap-3 px-6 py-4 bg-[#2a2c33] hover:bg-[#33353d] rounded-xl transition font-medium border border-gray-700">
              <XCircle className="w-5 h-5" /> No, I'm all set
            </button>
          </div>
        )}

        {/* Initial Choices */}
        {showInitialChoices && messages.length === 1 && (
          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => handleChoice('app')} className="p-6 bg-[#2a2c33] border border-gray-800 rounded-xl hover:border-[#8c5cff] transition text-left">
              <Sparkles className="w-8 h-8 mb-3 text-[#8c5cff]" />
              <h3 className="font-medium text-lg">Tell me about this app</h3>
              <p className="text-sm text-gray-500 mt-2">What it does, who it's for</p>
            </button>
            <button onClick={() => handleChoice('tools')} className="p-6 bg-[#2a2c33] border border-gray-800 rounded-xl hover:border-[#8c5cff] transition text-left">
              <HelpCircle className="w-8 h-8 mb-3 text-[#8c5cff]" />
              <h3 className="font-medium text-lg">Show me all tools</h3>
              <p className="text-sm text-gray-500 mt-2">Explore every feature</p>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Bar */}
<div className="px-6 py-4 text-center bg-card">
          <button
          onClick={endChat}
          disabled={!hasConversation}
          className={`text-sm transition ${hasConversation
            ? 'text-gray-500 hover:text-gray-300'
            : 'text-gray-700 cursor-not-allowed opacity-50'
          }`}
        >
          End chat
        </button>
      </div>
    </div>
  );
}