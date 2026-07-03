import AdminConsolePage from "./AdminConsolePage";

type SearchParams = Promise<{
  collection?: string;
  selectedId?: string;
}>;

export const dynamic = "force-dynamic";

export default function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  return <AdminConsolePage searchParams={searchParams} />;
}
