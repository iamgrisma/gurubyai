
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { CheckCircle, Calendar, Home } from 'lucide-react';

export const BookingSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-stone-200">
        <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-stone-900 mb-2">Booking Confirmed!</h1>
        <p className="text-stone-600 mb-8">
            Your ritual request has been sent successfully. The Guruba will be notified immediately.
        </p>

        <div className="bg-stone-50 rounded-lg p-4 mb-8 border border-stone-100 text-left">
            <p className="text-sm text-stone-500 mb-1">What happens next?</p>
            <ul className="list-disc list-inside text-sm text-stone-700 space-y-1">
                <li>Guruba confirms the time slot.</li>
                <li>You receive the Samagri list.</li>
                <li>Payment is handled after completion.</li>
            </ul>
        </div>

        <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/client')}>
                <Calendar className="h-4 w-4 mr-2" />
                Go to My Dashboard
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Back to Home
            </Button>
        </div>
      </div>
    </div>
  );
};
