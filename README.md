# auto-ssh-resume

A basic webserver that keep track of ssh connections and keep trying to reconnect regardless of network conditions. 

# Installation Instructions

## Setup Node.JS
This application uses node.js environment to handle web connections therefore you need to install node environment.

You can do so easily using Node Version Manager(nvm) -> https://github.com/nvm-sh/nvm

To **install** or **update** nvm, you should run the [install script][2]. To do that, you may either download and run the script manually, or use the following cURL or Wget command:
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
```
```sh
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
```

Running either of the above commands downloads a script and runs it. The script clones the nvm repository to `~/.nvm`, and attempts to add the source lines from the snippet below to the correct profile file (`~/.bash_profile`, `~/.zshrc`, `~/.profile`, or `~/.bashrc`).

<a id="profile_snippet"></a>
```sh
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```
Checks out https://github.com/nvm-sh/nvm/blob/master/README.md for more detailed instruction.

Try `nvm --version` to check if nvm is installed and loaded.

After `nvm` is installed. Run `nvm install node`. Try `node --verison` to ensure Node.JS is installed. 


## Setup dependencies

Navigate to `auto-ssh-resume` and type `npm install` to install all Node.JS dependencies for this app.

## Setup passwordless ssh

You must have already setup passwordless ssh for this app to work.



## Setup config.json file

The `config.json` file controls the app. `main_job` pings a server to check if the connection is set. If it is start `child_jobs` else kills all `child_jobs`. An example usage for this application is handling tunnels connection of jupyter notesbook. If the connection to the server is unstable the ssh connection is killed and restart once the connection is stable. This is done so that you won't have to manually kill and restart your ssh tunnels. `wiggle` controls how many time `ping` can fail before killing `child_jobs`. `port` controls which local port this web app is running on. You may visit this local port to on a web browser to see more information. An example `config.json` format is listed below. 

```json
{
    "port": 1000,
    "child_jobs": [
        {
            "command": "ssh",
            "arguments":  ["-N","-L","8889:localhost:8889","foo"]
        },
        {
            "command": "ssh",
            "arguments":  ["-N","-L","6006:localhost:6006","bar"]
        }
    ],
    "main_job": {
        "command": "ping",
        "arguments": ["bar"],
        "failure_errors":  ["ping: cannot resolve bar: Unknown host", "Request timeout"],
        "wiggle": 3
    }
}
```

## Starting the app

To start the app, navigate to `auto-ssh-resume` and type `node index.js`. An example run is below:

```console
auto-ssh-resume$ node index.js
Listening at http://localhost:1000
ssh -N -L 5555:localhost:5555 foo started!
ssh -N -L 9000:localhost:9000 bar started!
Instability detected, 2 wiggle left before reboot jobs.
Connection stabilized!
Instability detected, 2 wiggle left before reboot jobs.
Instability detected, 1 wiggle left before reboot jobs.
Connection stabilized!
Instability detected, 2 wiggle left before reboot jobs.
Connection stabilized!
Instability detected, 2 wiggle left before reboot jobs.
Connection stabilized!
Instability detected, 2 wiggle left before reboot jobs.
Connection stabilized!
```

## Child job instability

The app will detect if child ssh connection is interrupted and continuously attempt to resume every 3 seconds. 
```console
auto-ssh-resume$ node index.js
Listening at http://localhost:5555
ssh -N -L 1111:localhost:1111 foo started!
ssh -N -L 2222:localhost:2222 foo started!
ssh -N -L 3333:localhost:3333 foo started!
ssh -N -L 4444:localhost:4444 foo started!
child 2 error: Connection to foo closed by remote host.
. Waiting for 3 seconds before retry.
child ssh -N -L 1111:localhost:1111 foo stopped.
child 0 error: Connection to foo closed by remote host.
. Waiting for 3 seconds before retry.
child ssh -N -L 2222:localhost:2222 foo stopped.
child 1 error: Connection to foo closed by remote host.
. Waiting for 3 seconds before retry.
child ssh -N -L 4444:localhost:4444 foo stopped.
child 3 error: Connection to foo closed by remote host.
. Waiting for 3 seconds before retry.
child 2 is available again.
ssh -N -L 3333:localhost:3333 foo started!
child ssh -N -L 3333:localhost:3333 foo stopped.
child 2 error: ssh: connect to host foo port 922: Connection refused
. Waiting for 3 seconds before retry.
child 0 is available again.
ssh -N -L 1111:localhost:1111 foo started!
child ssh -N -L 1111:localhost:1111 foo stopped.
child 0 error: ssh: connect to host foo port 922: Connection refused
. Waiting for 3 seconds before retry.
child 1 is available again.
ssh -N -L 2222:localhost:2222 foo started!
child ssh -N -L 2222:localhost:2222 foo stopped.
child 1 error: ssh: connect to host foo port 922: Connection refused
. Waiting for 3 seconds before retry.
child 3 is available again.
child 2 is available again.
child 0 is available again.
ssh -N -L 1111:localhost:1111 foo started!
ssh -N -L 3333:localhost:3333 foo started!
ssh -N -L 4444:localhost:4444 foo started!
child 1 is available again.
ssh -N -L 2222:localhost:2222 foo started!
```
