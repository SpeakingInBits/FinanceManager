// Central registry: importing each module registers its custom element as a side effect.
import '@/components/shared/icon';
import '@/components/shared/modal-dialog';
import '@/components/shared/empty-state';
import '@/components/shared/amount-input';

import '@/components/shell/bottom-nav';
import '@/components/shell/theme-toggle';

import '@/components/transactions/transaction-list-item';
import '@/components/transactions/transaction-list';
import '@/components/transactions/transaction-form';
import '@/components/transactions/transaction-modal';

import '@/components/categories/category-node';
import '@/components/categories/category-tree';
import '@/components/categories/category-form';

import '@/components/budgets/budget-progress-bar';
import '@/components/budgets/budget-card';
import '@/components/budgets/budget-list';
import '@/components/budgets/budget-form';

import '@/components/recurring/recurring-card';
import '@/components/recurring/recurring-list';
import '@/components/recurring/recurring-form';

import '@/charts/pie-chart';
import '@/charts/sankey-chart';

import '@/components/views/dashboard-view';
import '@/components/views/transactions-view';
import '@/components/views/categories-view';
import '@/components/views/budgets-view';
import '@/components/views/recurring-view';
import '@/components/views/charts-view';

import '@/app-shell';
