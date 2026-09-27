import { TeamService } from '../apps/api/src/services/team.service.ts';

const service = new TeamService();

async function test() {
  const result = await service.listMembers({ page: 1, limit: 10, role: 'all', status: 'all', moduleAccess: 'all' });
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
