import ContactForm from '@/components/contact/ContactPage';
import React from 'react';

export const metadata = {
  title: `Contact Support — ${process.env.APP_NAME}`,
  description: 'Get in touch with our support team for help with any questions or issues.',
};

function Page() {
  return (
    <div>
      <ContactForm />
    </div>
  );
}

export default Page;