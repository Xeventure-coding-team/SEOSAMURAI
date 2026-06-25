"use client";

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ContactLayout from '@/app/layouts/ContactLayout';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    category: '',
    email: '',
    subject: '',
    description: '',
  });
  
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const categories = ['General Inquiry', 'Technical Support', 'Billing', 'Feature Request', 'Other'];

  // Auto-hide alert after 5 seconds
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000); // Hide after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset status before validation
    setStatus('idle');
    setMessage('');
    
    // Validation
    if (!formData.category) {
      setStatus('error');
      setMessage('Please select a category');
      return;
    }
    
    if (!formData.email || !formData.email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }
    
    if (!formData.subject.trim()) {
      setStatus('error');
      setMessage('Please enter a subject');
      return;
    }
    
    if (!formData.description.trim()) {
      setStatus('error');
      setMessage('Please enter a description');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      setStatus('success');
      setMessage(data.message || 'Your message has been sent successfully!');
      
      // Reset form
      setFormData({
        category: '',
        email: '',
        subject: '',
        description: '',
      });
      
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Something went wrong. Please try again.');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <ContactLayout>
      <div className="container mx-auto max-w-3xl px-4">
        <h2 className="text-3xl font-bold mb-6">Contact Support</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Field */}
          <div className="space-y-2">
            <Label htmlFor="category">Select a category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Your email address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Brief description of your issue"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              required
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about your issue"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={8}
              required
            />
          </div>

          {/* Status Messages - Only show when not idle */}
          {status !== 'idle' && (
            <Alert variant={status === 'success' ? 'default' : 'destructive'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <span className="mr-2">Sending...</span>
                <span className="inline-block animate-spin">⟳</span>
              </>
            ) : 'Submit'}
          </Button>
        </form>
      </div>
    </ContactLayout>
  );
};

export default ContactForm;