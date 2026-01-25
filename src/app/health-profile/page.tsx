import { getHealthProfile } from '@/app/actions/health-profile';
import HealthProfileClient from '@/components/habits/HealthProfileClient';

export const dynamic = 'force-dynamic';

export default async function HealthProfilePage() {
    const profileRes = await getHealthProfile();

    return (
        <HealthProfileClient
            initialSections={profileRes.data || []}
        />
    );
}
