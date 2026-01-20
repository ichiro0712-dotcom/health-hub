import { getHealthProfile } from '@/app/actions/health-profile';
import HealthProfileClient from '@/components/habits/HealthProfileClient';

export default async function HabitsPage() {
    const profileRes = await getHealthProfile();

    return (
        <HealthProfileClient
            initialSections={profileRes.data || []}
        />
    );
}
