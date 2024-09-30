export default function Explorer() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Explorer</h2>
        {/* Add your explorer content here */}
        <div className="space-y-2">
          <div className="p-2 bg-secondary rounded">Item 1</div>
          <div className="p-2 bg-secondary rounded">Item 2</div>
          <div className="p-2 bg-secondary rounded">Item 3</div>
          {/* Add more items as needed */}
        </div>
      </div>
    </div>
  );
}
