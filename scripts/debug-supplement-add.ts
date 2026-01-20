import { addSupplement, getSupplements } from '../src/app/actions/supplements';

async function main() {
    console.log('--- Debugging Supplement Addition ---');

    // Simulate data
    const data = {
        name: 'Debug Vitamin ' + Date.now(),
        timing: ['朝'],
        amount: '1',
        unit: 'tablet',
        startDate: new Date(), // Passing Date object
        pausedPeriods: [{ from: '2023-01-01', to: '2023-01-05' }]
    };

    console.log('Sending data:', data);

    const res = await addSupplement(data);
    console.log('Add Result:', res);

    if (res.success) {
        console.log('Checking list...');
        const listRes = await getSupplements();
        if (listRes.success) {
            const found = listRes.data?.find(s => s.id === res.data?.id);
            if (found) {
                console.log('SUCCESS: Found added supplement in list:', found);
            } else {
                console.error('FAILURE: Added supplement NOT found in list.');
            }
        } else {
            console.error('Failed to fetch list:', listRes.error);
        }
    }
}

main();
