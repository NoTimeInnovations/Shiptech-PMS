// import { db } from "@/lib/firebase";
// import { Task } from "@/store/taskStore";
// import { getDoc, doc, setDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Test = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);

  const submitAction = async (e: any) => {
    e.preventDefault();

    console.log('submitting');
    setIsLoading(true);

    // try {
    //   const projectId = 'cqeN38Id7Hc5XfmizP5u';
    //   const projectRef = doc(db, "projects", projectId);
    //   const projectSnap = await getDoc(projectRef);

    //   if (!projectSnap.exists()) {
    //     console.error("Project not found!");
    //     return;
    //   }

    //   const project = projectSnap.data();
    //   const tasks = project?.tasks || [];

    //   const taskNodes: Task[] = [];

    //   // Recursive function to flatten the task structure
    //   const flatten = (task: Task, parentId: string | null = null) => {
    //     const { children, id, ...taskWithoutChildren } = task;
    //     const newTask = { 
    //       ...taskWithoutChildren, 
    //       id, 
    //       parentId,
    //       projectId // Add projectId to each task
    //     }; 
    //     taskNodes.push(newTask);

    //     if (children && children.length > 0) {
    //       children.forEach((child) => flatten(child, id));
    //     }
    //   };

    //   tasks.forEach((task: Task) => flatten(task, null));

    //   // Move tasks to "tasks" collection
    //   const tasksCollection = collection(db, "tasks");

    //   await Promise.all(
    //     taskNodes.map(async (task) => {
    //       const taskRef = doc(tasksCollection, task.id);
    //       await setDoc(taskRef, task);
    //     })
    //   );

    //   console.log("Tasks moved successfully.");
      setIsSubmitSuccessful(true);

    // } catch (error) {
    //   console.error("Error moving tasks:", error);
    // } finally {
    //   setIsLoading(false);
    // }
  };

  return (
    <div className="p-6">
      <form onSubmit={submitAction}>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : isSubmitSuccessful ? "Updated" : "Update"}
        </Button>
      </form>
    </div>
  );
};

export default Test;
