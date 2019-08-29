#!/bin/bash

# OPAM packages needed to build tests.
OPAM_PACKAGES="cmdliner"


echo "yes" | sudo add-apt-repository ppa:avsm/ppa
sudo apt-get update -qq
sudo apt-get install -qq ocaml ocaml-findlib ocaml-native-compilers camlp4-extra opam gnuplot m4
export OPAMYES=1
export OPAMVERBOSE=1
echo OCaml version
ocaml -version
echo OPAM versions
opam --version
opam --git-version

opam init 
opam install ${OPAM_PACKAGES}

eval `opam config env`

# Post-boilerplate
git clone http://github.com/robhoes/elo-ladder
cd elo-ladder
make

curl -o players.csv "https://docs.google.com/spreadsheets/d/1GqkA-JE7a7TXrD2_OazaqU1t0FjMdXc2wO3CP1MiTCU/gviz/tq?tqx=out:csv&sheet=Players"
tail -n +2 players.csv | tr -d \" | tr 'TRUE' 'true' > players

curl -o games.csv "https://docs.google.com/spreadsheets/d/1GqkA-JE7a7TXrD2_OazaqU1t0FjMdXc2wO3CP1MiTCU/gviz/tq?tqx=out:csv&sheet=Games"
tail -n +2 games.csv | tr -d \" > games

./ladder print --gh-pages --game pool --title "Dover St Pool Ladder" ../players ../games --reverse > index.md
./ladder json --game pool ../players ../games > ladder.json
(echo set terminal png; ./ladder history --game pool --format=gnuplot ../players ../games) | gnuplot > ladder.png

if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
  echo -e "Starting to update gh-pages\n"

  #copy data we're interested in to other place
  #cp index.html $HOME/index.html
  cp ladder.js $HOME/ladder.js
  cp ladder.json $HOME/ladder.json
  cp ladder.png $HOME/ladder.png
  cp style.css $HOME/style.css

  #go to home and setup git
  cd $HOME
  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "Travis"

  #using token clone gh-pages branch
  git clone --quiet --branch=gh-pages https://${GH_TOKEN}@github.com/samvrlewis/elo-ladder-pool.git  gh-pages > /dev/null

  #go into directory and copy data we're interested in to that directory
  cd gh-pages
  #cp -f $HOME/index.html .
  cp -f $HOME/ladder.js .
  cp -f $HOME/ladder.json .
  cp -f $HOME/ladder.png .
  cp -f $HOME/style.css .

  #add, commit and push files
  git commit --allow-empty -am "Travis build $TRAVIS_BUILD_NUMBER pushed to gh-pages"
  git push -fq origin gh-pages > /dev/null

  echo -e "Updated samvrlewis's/elo-ladder-pool's gh-pages with latest ladder\n"
fi
