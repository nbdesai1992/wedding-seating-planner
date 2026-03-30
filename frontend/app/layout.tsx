export const metadata = {
  title: "wedding-planner",
  description: "This would be an AI-based wedding seat planner and guest management app. It's marketed towards a bride to keep track of their guests and can use a description to generate a spatial layout of their room and align the tables, dance floor, etc all ke yaspects of the layout and it will have a very intuitive and easy to use layout and methodology for assignign guests to tables. We hsoud be thinking about usability and flexibilty both. Users should nto get frustrated that it cant do what they want, but it should also be easy. We should also have a PDF export option of the actual seting chart. We should offer support for multiple events as well. This should give you an idea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
