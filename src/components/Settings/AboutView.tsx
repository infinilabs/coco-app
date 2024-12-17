export default function AboutView(){
  return <div className="text-gray-600 dark:text-gray-400">
  <div className="mx-auto px-4">
    <header className="text-center">
      <h1 className="text-4xl font-bold text-blue-600">
        Coco AI - Connect & Collaborate
      </h1>
      <p className="mt-2 text-lg italic text-gray-600">
        "Coco AI - search, connect, collaborate – all in one
        place."
      </p>
    </header>

    <section className="mt-10">
      <h2 className="text-2xl font-semibold ">
        What is Coco AI?
      </h2>
      <p className="mt-4 leading-relaxed">
        Coco AI is a unified search platform that connects
        all your enterprise applications and data—Google
        Workspace, Dropbox, Confluent Wiki, GitHub, and
        more—into a single, powerful search interface.
      </p>
      <p className="mt-4  leading-relaxed">
        The app allows users to search and interact with
        their enterprise data across platforms.
      </p>
    </section>

    <section className="mt-10 bg-blue-50 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-blue-600">
        Gen-AI Chat for Teams
      </h2>
      <p className="mt-4  leading-relaxed">
        Imagine{" "}
        <span className="font-semibold">ChatGPT</span>, but
        tailored to your team’s unique knowledge and
        internal resources.
      </p>
      <p className="mt-4  leading-relaxed">
        Coco AI enhances collaboration by making information
        instantly accessible and providing AI-driven
        insights based on your enterprise's specific data.
      </p>
    </section>
  </div>
</div>
}