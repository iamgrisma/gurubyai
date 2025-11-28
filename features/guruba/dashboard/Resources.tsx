
import React from 'react';
import { BookOpen, FileText, Video, ExternalLink, Download } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ResourceCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel: string;
    onClick: () => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ icon: Icon, title, description, actionLabel, onClick }) => (
    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all">
        <div className="h-12 w-12 bg-saffron-50 rounded-lg flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-saffron-600" />
        </div>
        <h3 className="font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-sm text-stone-500 mb-4 h-10">{description}</p>
        <Button variant="outline" size="sm" className="w-full" onClick={onClick}>
            {actionLabel}
        </Button>
    </div>
);

export const GurubaResources: React.FC = () => {
    const resources = [
        {
            icon: BookOpen,
            title: "Platform Guide",
            description: "Learn how to manage bookings, update your profile, and get paid.",
            actionLabel: "Read Guide",
            onClick: () => window.open('#', '_blank')
        },
        {
            icon: FileText,
            title: "Vedic Mantras PDF",
            description: "Common mantras and procedures for standard rituals.",
            actionLabel: "Download PDF",
            onClick: () => alert("Download started...")
        },
        {
            icon: Video,
            title: "Video Tutorials",
            description: "Watch step-by-step tutorials on conducting online rituals.",
            actionLabel: "Watch Videos",
            onClick: () => window.open('#', '_blank')
        },
        {
            icon: FileText,
            title: "Code of Conduct",
            description: "Guidelines for maintaining professionalism and authenticity.",
            actionLabel: "View Guidelines",
            onClick: () => window.open('#', '_blank')
        },
        {
            icon: Download,
            title: "Marketing Assets",
            description: "Download logos and banners to promote your services.",
            actionLabel: "Download Kit",
            onClick: () => alert("Download started...")
        },
        {
            icon: ExternalLink,
            title: "Support Center",
            description: "Need help? Contact our support team for assistance.",
            actionLabel: "Contact Support",
            onClick: () => window.open('#', '_blank')
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-stone-900">Resources</h2>
                <p className="text-stone-500">Guides, tools, and materials to help you succeed as a Guruba.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource, index) => (
                    <ResourceCard key={index} {...resource} />
                ))}
            </div>

            <div className="bg-saffron-50 rounded-xl p-6 border border-saffron-100 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-saffron-900">Need something else?</h3>
                    <p className="text-sm text-saffron-700">Request specific resources or guides from the admin team.</p>
                </div>
                <Button className="bg-saffron-600 hover:bg-saffron-700 text-white">
                    Request Resource
                </Button>
            </div>
        </div>
    );
};
