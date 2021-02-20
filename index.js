const express = require('express')
const config = require('./config.json')
const app = express()
const port = config.port
const child_jobs = config.child_jobs
const main_job = config.main_job
const { spawn } = require("child_process");

let main_job_fail_counter = 0
let tracking = false;
const status = {
  "main_job": main_job,
  "child_jobs": []
}
status["main_job"]["running"] = false;

for (let i=0; i < child_jobs.length; i++){
  const child_job = child_jobs[i];
  child_job["running"] = false;
  status["child_jobs"].push(child_job)
}

function start_all_childs_jobs(){
  for(let i = 0; i < status.child_jobs.length; i++){
    if (status["child_jobs"][i]["running"] == false && status["main_job"]["running"] == true ){
      const job_name = status.child_jobs[i].command + " " + (status.child_jobs[i].arguments).join(" ")
      console.log(`${job_name} started!`);
      const child_job_instance = spawn(status["child_jobs"][i]["command"], status["child_jobs"][i]["arguments"]);
      status["child_jobs"][i]["running"] = true;
      status["child_jobs"][i]["instance"] = child_job_instance;
    } 
  }
}

function stop_all_child_jobs(){
  for(let i = 0; i < status.child_jobs.length; i++){
    if (status["child_jobs"][i]["running"] == true && status["main_job"]["running"] == false){
      status["child_jobs"][i]["instance"].stdin.pause();
      status["child_jobs"][i]["instance"].kill()
      status["child_jobs"][i]["running"] = false;
      console.log("child jobs stopped");
    }
  }
}
function stop_all(){
  status["main_job"]["running"] = false;
  status["main_job"]["instance"].stdin.pause();
  status["main_job"]["instance"].kill("SIGKILL");
  tracking = false;
  main_job_fail_counter = 0
  stop_all_child_jobs();
}
function begin_tracking(){
  status["main_job"]["instance"].on("close", code => {
    stop_all();
  });
  status["main_job"]["instance"].stdout.on("data", data => {
    if (data.includes("Request timeout")){
      main_job_fail_counter += 1
      console.log(`Instability detected, ${config.main_job.wiggle - main_job_fail_counter} wiggle left before reboot jobs.`)
      if (main_job_fail_counter >= config.main_job.wiggle){
        stop_all();
      }
    } else if (data.includes("bytes")) {
      tracking = true;
      // console.log(`main job is alive!`);
      if (main_job_fail_counter != 0) {
        main_job_fail_counter = 0;
        console.log(`Connection stabilized!`)
      }
      start_all_childs_jobs();
    }
  });
  status["main_job"]["instance"].on("error", error => {
    stop_all();
  });
}

const interval = setInterval(function(){
  if (status["main_job"]["running"] == false){
    const main_job_instance = spawn(status["main_job"]["command"], status["main_job"]["arguments"]);
    status["main_job"]["instance"] = main_job_instance;
    status["main_job"]["running"] = true;
    begin_tracking();
  } 
}, 2000);


if(tracking == false && status["main_job"]["running"] == true){
  begin_tracking();
}

app.get('/', (req, res) => {
  const nice_res = {
    "main_job": {
      "command": status.main_job.command + " " +(status.main_job.arguments).join(" "),
      "running": status.main_job.running
    },
    "child_jobs": []
  };
  for(let i = 0; i < status.child_jobs.length; i++){
    const child = {
      "command": status.child_jobs[i].command + " " + (status.child_jobs[i].arguments).join(" "),
      "running": status.child_jobs[i].running
    }
    nice_res.child_jobs.push(child);
  }
  res.header("Content-Type", "application/json");
  res.json(nice_res);
})

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})

