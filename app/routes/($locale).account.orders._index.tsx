import {Link, useLoaderData, type MetaFunction} from '@remix-run/react';
import {
  Money,
  Pagination,
  getPaginationVariables,
  flattenConnection,
  Image,
} from '@shopify/hydrogen';
import {json, redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'customer-accountapi.generated';

export const meta: MetaFunction = () => {
  return [{title: 'Orders'}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });
  let access = await context.customerAccount.getAccessToken();
  console.log(access);

  const {data, errors} = await context.customerAccount.query(
    CUSTOMER_ORDERS_QUERY,
    {
      variables: {
        ...paginationVariables,
      },
    },
  );

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return json(
    {customer: data.customer},
    {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    },
  );
}

export default function Orders() {
  const {customer} = useLoaderData<{customer: CustomerOrdersFragment}>();
  const {orders} = customer;
  return (
    <div className="orders">
      {orders.nodes.length ? <OrdersTable orders={orders} /> : <EmptyOrders />}
    </div>
  );
}

function OrdersTable({orders}: Pick<CustomerOrdersFragment, 'orders'>) {
  return (
    <div className="acccount-orders grid grid-cols-1 md:grid-cols-2 gap-4">
      {orders?.nodes.length ? (
        <Pagination connection={orders}>
          {({nodes, isLoading, PreviousLink, NextLink}) => {
            return (
              <>
                <PreviousLink>
                  {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
                </PreviousLink>
                {nodes.map((order) => {
                  return <OrderItem key={order.id} order={order} />;
                })}
                <NextLink>
                  {isLoading ? 'Loading...' : <span>Load more ↓</span>}
                </NextLink>
              </>
            );
          }}
        </Pagination>
      ) : (
        <EmptyOrders />
      )}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div>
      <p>You haven&apos;t placed any orders yet.</p>
      <br />
      <p>
        <Link to="/collections">Start Shopping →</Link>
      </p>
    </div>
  );
}

function OrderItem({order}: {order: OrderItemFragment}) {
  console.log('🚀 ~ order:', order);
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
  let item = order.lineItems.nodes[0];
  let length = order.lineItems.nodes.length;
  let image = item?.image;
  let title = item?.title;
  if (length > 1) {
    title = `${item?.title} + ${length - 1} more`;
  }
  return (
    <div className="flex gap-2 p-5 border border-bar-subtle">
      <Image data={image} className="w-40 h-auto" width={140} />
      <div className="space-y-2">
        <Link to={`/account/orders/${btoa(order.id)}`}>
          <h4 className="font-medium">{title}</h4>
        </Link>
        <div className="space-y-1">
          <p>Order no. {order.number}</p>
          <p>{new Date(order.processedAt).toDateString()}</p>
        </div>

        <p className="p-2 bg-label-soldout rounded w-fit text-white">
          {order.financialStatus}
        </p>
        {/* <Money data={order.totalPrice} /> */}
        <p>
          <Link to={`/account/orders/${btoa(order.id)}`}>View Details</Link>
        </p>
      </div>
    </div>
  );
}
