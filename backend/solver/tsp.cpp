#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

const long long INF = 1e15;
int n, startNode;
long long dist[16][16];
long long memo[1 << 16][16];
int parent[1 << 16][16];

long long solve(int mask, int pos) {
    if (mask == (1 << n) - 1) return dist[pos][startNode]; 
    if (memo[mask][pos] != -1) return memo[mask][pos];

    long long ans = INF;
    for (int next = 0; next < n; next++) {
        if (!(mask & (1 << next))) {
            long long newDist = dist[pos][next] + solve(mask | (1 << next), next);
            if (newDist < ans) {
                ans = newDist;
                parent[mask][pos] = next;
            }
        }
    }
    return memo[mask][pos] = ans;
}

void printPath(int mask, int pos) {
    cout << pos << " ";
    if (mask == (1 << n) - 1) return;
    printPath(mask | (1 << parent[mask][pos]), parent[mask][pos]);
}

int main() {
    if (!(cin >> n >> startNode)) return 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) cin >> dist[i][j];
    }
    for (int i = 0; i < (1 << n); i++) {
        for (int j = 0; j < n; j++) memo[i][j] = -1;
    }
    cout << solve(1 << startNode, startNode) << endl;
    printPath(1 << startNode, startNode);
    return 0;
}