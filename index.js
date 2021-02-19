const express = require('express')
const config = require('./config.json')
const app = express()
const port = config.port
const child_jobs = config.child_jobs
const main_job = config.main_job
const { exec } = require("child_process");
const { spawn } = require("child_process");
const { stdout } = require('process')
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants')
const { stat } = require('fs')
/*
example status object
{
  "main_job_running": true,
  "child_jobs": [
    {
      "job": "ssh cheese",
      "running": true
    }
  ]
}
*/

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
console.log(status["child_jobs"][0]["arguments"])
function start_all_childs_jobs(){
  for(let i = 0; i < status.child_jobs.length; i++){
    if (status["child_jobs"][i]["running"] == false && status["main_job"]["running"] == true ){
      console.log("child jobs started");
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
function begin_tracking(){
  status["main_job"]["instance"].on("close", code => {
    status["main_job"]["running"] = false;
    console.log(`main job exited with code ${code}`);
    stop_all_child_jobs();
    status["main_job"]["instance"].stdin.pause();
    status["main_job"]["instance"].kill("SIGKILL");
    tracking = false;
  });
  status["main_job"]["instance"].stdout.on("data", data => {
    if (data.includes("Request timeout")){
      status["main_job"]["running"] = false;
      console.log(`main job is dead, stopping child jobs!`);
      status["main_job"]["instance"].stdin.pause();
      status["main_job"]["instance"].kill("SIGKILL");
      tracking = false;
      stop_all_child_jobs();
    } else if (data.includes("bytes")) {
      tracking = true;
      console.log(`main job is alive!`);
      start_all_childs_jobs();
    }
  });
  status["main_job"]["instance"].on("error", error => {
    status["main_job"]["running"] = false;
    console.log(`main job failed with error ${error}`);
    status["main_job"]["instance"].stdin.pause();
    status["main_job"]["instance"].kill("SIGKILL");
    tracking = false;
    stop_all_child_jobs();
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

