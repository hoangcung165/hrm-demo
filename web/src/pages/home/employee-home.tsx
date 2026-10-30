import { HomeLeaveBalance } from './home-leave-balance';
import { HomeNotifications } from './home-notifications';
import { HomePendingRequests } from './home-pending-requests';
import { HomeShortcuts } from './home-shortcuts';

// The Employee's Tổng quan (artboard `#20 Tổng quan (Nhân viên, 390)`): shortcuts, Số dư phép, the request that waits
// and the latest notifications. At 390 one column in that order; on a desktop the same blocks in the widget grid.
// Each block loads and fails on its own.
export function EmployeeHome() {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <HomeShortcuts className="md:col-span-2" />
      <HomeLeaveBalance />
      <HomePendingRequests />
      <HomeNotifications className="md:col-span-2" />
    </div>
  );
}
