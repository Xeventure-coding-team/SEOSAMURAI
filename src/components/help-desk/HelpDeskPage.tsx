// src/components/help-desk/HelpDeskPage.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Sparkles,
  MapPin,
  Megaphone,
  CalendarClock,
  ScanSearch,
  Star,
  QrCode,
  BellRing,
  HelpCircle,
  Bot,
  X,
} from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

const TOOLS = {
  locations: { title: 'Locations', icon: MapPin, desc: 'Manage all your Google Business Profiles in one place.' },
  'bulk-posting': { title: 'Bulk Posting', icon: Megaphone, desc: 'Post to hundreds of locations instantly.' },
  'schedule-posting': { title: 'Schedule Posting', icon: CalendarClock, desc: 'Schedule posts for later — perfect for campaigns.' },
  'run-scan': { title: 'Run a Scan', icon: ScanSearch, desc: 'Find issues across all locations in minutes.' },
  reviews: { title: 'Reviews', icon: Star, desc: 'View and reply to reviews from all locations.' },
  'review-poster': { title: 'Review Poster', icon: QrCode, desc: 'Generate QR codes & links to get more 5-star reviews.' },
  'tracked-reviews': {
    title: 'Tracked Reviews',
    icon: BellRing,
    desc: 'Get instant alerts (Email/Slack/Webhook) when new reviews arrive.\nAuto-reply, track trends, never miss a review.',
  },
  chat: { title: 'Help Chat', icon: MessageCircle, desc: "You're here! Ask anything about the app." },
};

export default function HelpDeskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMessages([{
        role: 'assistant',
        content: "Hi! How can I help you today?",
      }]);
    }, 300);
  }, []);

  const send = (text: string, isUser = false) => {
    setMessages(prev => [...prev, { role: isUser ? 'user' : 'assistant', content: text }]);
  };

  const handleChoice = (type: 'app' | 'tools') => {
    send(type === 'app' ? 'Tell me about this app' : 'Tell me about the tools', true);

    setTimeout(() => {
      if (type === 'app') {
        send(`This app helps agencies and multi-location businesses manage Google Business Profiles at scale.

You can:
• Manage 100s of locations
• Post & schedule in bulk
• Get instant review alerts
• Generate review QR codes
• Scan for issues automatically

All in one clean dashboard — saving you hours every week.`);
      } else {
        send('Here are all the tools:');
        setShowTools(true);
      }
    }, 500);
  };

  const handleTool = (key: string) => {
    const tool = TOOLS[key as keyof typeof TOOLS];
    send(tool.title, true);
    send(tool.desc);
  };

  const endChat = () => {
    if (confirm('End chat and go back?')) {
      window.history.back();
      // or: window.location.href = '/dashboard'
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="font-semibold text-lg">Help & Support</h1>
            <p className="text-xs text-gray-500">Usually replies instantly</p>
          </div>
        </div>
        <button
          onClick={endChat}
          className="p-2 hover:bg-gray-900 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-5 py-3 rounded-2xl ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 border border-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}

        {/* Tool Cards */}
        {showTools && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {Object.entries(TOOLS).map(([key, tool]) => {
              const Icon = tool.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleTool(key)}
                  className="p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-gray-850 transition text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">{tool.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {tool.desc.split('\n')[0]}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Initial Choices */}
        {messages.length === 1 && (
          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleChoice('app')}
              className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition text-left"
            >
              <Sparkles className="w-8 h-8 mb-3 text-blue-500" />
              <h3 className="font-medium text-lg">Tell me about this app</h3>
              <p className="text-sm text-gray-500 mt-2">What it does, who it's for</p>
            </button>

            <button
              onClick={() => handleChoice('tools')}
              className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition text-left"
            >
              <HelpCircle className="w-8 h-8 mb-3 text-blue-500" />
              <h3 className="font-medium text-lg">Tell me about tools</h3>
              <p className="text-sm text-gray-500 mt-2">See every feature explained</p>
            </button>
          </div>
        )}
      </div>

      {/* End Chat Button */}
      <div className="border-t border-gray-800 px-6 py-4 text-center">
        <button
          onClick={endChat}
          className="text-sm text-gray-500 hover:text-gray-300 transition"
        >
          End chat
        </button>
      </div>
    </div>
  );
}