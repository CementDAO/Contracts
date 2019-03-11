workflow "Build, Test, and Lint" {
  on = "push"
  resolves = ["Lint"]
}

action "Build" {
  uses = "actions/npm@master"
  args = "install"
}

action "Test" {
  needs = "Build"
  uses = "actions/npm@master"
  args = "test"
}

action "Lint" {
  needs = "Test"
  uses = "actions/npm@master"
  args = "lint"
}